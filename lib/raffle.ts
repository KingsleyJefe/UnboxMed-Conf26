import { randomUUID } from "node:crypto";
import { and, count, desc, eq, max, notExists, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { raffleDraws, registrations } from "@/db/schema";
import { formatTicketCode } from "@/lib/registration";
import {
  getRaffleFirstName,
  pickRandomCandidate,
  RAFFLE_CLAIM_WINDOW_MS,
  RAFFLE_REVEAL_DELAY_MS,
} from "@/lib/raffle-core";
import type { RaffleDrawView, RaffleState } from "@/lib/raffle-types";

const RAFFLE_ADVISORY_LOCK = 2608152026;

function toDrawView(draw: {
  id: string;
  roundNumber: number;
  status: "selected" | "confirmed" | "redrawn";
  createdAt: Date;
  resolvedAt: Date | null;
  name: string;
  ticketNumber: number;
}): RaffleDrawView {
  const revealAt = new Date(draw.createdAt.getTime() + RAFFLE_REVEAL_DELAY_MS);
  return {
    id: draw.id,
    roundNumber: draw.roundNumber,
    status: draw.status,
    firstName: getRaffleFirstName(draw.name),
    ticketCode: formatTicketCode(draw.ticketNumber),
    createdAt: draw.createdAt.toISOString(),
    revealAt: revealAt.toISOString(),
    claimEndsAt: new Date(revealAt.getTime() + RAFFLE_CLAIM_WINDOW_MS).toISOString(),
    resolvedAt: draw.resolvedAt?.toISOString() ?? null,
  };
}

export async function getRaffleState(): Promise<RaffleState> {
  const database = getDatabase();
  const alreadyDrawn = database
    .select({ id: raffleDraws.id })
    .from(raffleDraws)
    .where(eq(raffleDraws.registrationId, registrations.id));

  const [eligibleRows, drawRows] = await Promise.all([
    database
      .select({ value: count() })
      .from(registrations)
      .where(and(eq(registrations.status, "checked_in"), notExists(alreadyDrawn))),
    database
      .select({
        id: raffleDraws.id,
        roundNumber: raffleDraws.roundNumber,
        status: raffleDraws.status,
        createdAt: raffleDraws.createdAt,
        resolvedAt: raffleDraws.resolvedAt,
        name: registrations.name,
        ticketNumber: registrations.ticketNumber,
      })
      .from(raffleDraws)
      .innerJoin(registrations, eq(raffleDraws.registrationId, registrations.id))
      .orderBy(desc(raffleDraws.createdAt)),
  ]);

  const draws = drawRows.map(toDrawView);
  const highestRound = draws.reduce((highest, draw) => Math.max(highest, draw.roundNumber), 0);
  return {
    eligibleCount: eligibleRows[0]?.value ?? 0,
    drawnCount: draws.length,
    confirmedCount: draws.filter((draw) => draw.status === "confirmed").length,
    nextRoundNumber: highestRound + 1,
    current: draws[0] ?? null,
    history: draws.filter((draw) => draw.status === "confirmed"),
  };
}

export async function startRaffleDraw() {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(${RAFFLE_ADVISORY_LOCK})`);

    const [active] = await transaction
      .select({ id: raffleDraws.id })
      .from(raffleDraws)
      .where(eq(raffleDraws.status, "selected"))
      .limit(1);
    if (active) return { kind: "active_exists" as const };

    const drawnRegistration = transaction
      .select({ id: raffleDraws.id })
      .from(raffleDraws)
      .where(eq(raffleDraws.registrationId, registrations.id));
    const candidates = await transaction
      .select({
        id: registrations.id,
        name: registrations.name,
        ticketNumber: registrations.ticketNumber,
      })
      .from(registrations)
      .where(and(eq(registrations.status, "checked_in"), notExists(drawnRegistration)))
      .orderBy(registrations.id);

    const winner = pickRandomCandidate(candidates);
    if (!winner) return { kind: "no_eligible" as const };

    const [round] = await transaction
      .select({ value: max(raffleDraws.roundNumber) })
      .from(raffleDraws);
    await transaction.insert(raffleDraws).values({
      id: randomUUID(),
      roundNumber: (round?.value ?? 0) + 1,
      registrationId: winner.id,
      status: "selected",
    });
    return { kind: "selected" as const };
  });
}

export async function confirmRaffleDraw(drawId: string) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(${RAFFLE_ADVISORY_LOCK})`);
    const [confirmed] = await transaction
      .update(raffleDraws)
      .set({ status: "confirmed", resolvedAt: new Date() })
      .where(and(eq(raffleDraws.id, drawId), eq(raffleDraws.status, "selected")))
      .returning({ id: raffleDraws.id });
    return confirmed ? { kind: "confirmed" as const } : { kind: "not_selected" as const };
  });
}

export async function redrawRaffleDraw(drawId: string) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(${RAFFLE_ADVISORY_LOCK})`);
    const [current] = await transaction
      .select({ id: raffleDraws.id, roundNumber: raffleDraws.roundNumber })
      .from(raffleDraws)
      .where(and(eq(raffleDraws.id, drawId), eq(raffleDraws.status, "selected")))
      .limit(1);
    if (!current) return { kind: "not_selected" as const };

    await transaction
      .update(raffleDraws)
      .set({ status: "redrawn", resolvedAt: new Date() })
      .where(eq(raffleDraws.id, current.id));

    const drawnRegistration = transaction
      .select({ id: raffleDraws.id })
      .from(raffleDraws)
      .where(eq(raffleDraws.registrationId, registrations.id));
    const candidates = await transaction
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.status, "checked_in"), notExists(drawnRegistration)))
      .orderBy(registrations.id);
    const replacement = pickRandomCandidate(candidates);
    if (!replacement) return { kind: "no_eligible" as const };

    await transaction.insert(raffleDraws).values({
      id: randomUUID(),
      roundNumber: current.roundNumber,
      registrationId: replacement.id,
      status: "selected",
    });
    return { kind: "redrawn" as const };
  });
}
