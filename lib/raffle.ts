import { randomUUID } from "node:crypto";
import { and, count, desc, eq, max, notExists, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { raffleDraws, raffleSessions, registrations } from "@/db/schema";
import { formatTicketCode } from "@/lib/registration";
import {
  getRaffleFirstName,
  pickRandomCandidate,
  RAFFLE_CLAIM_WINDOW_MS,
  RAFFLE_REVEAL_DELAY_MS,
} from "@/lib/raffle-core";
import type { RaffleDrawView, RaffleMode, RaffleState } from "@/lib/raffle-types";

async function lockRaffleSession(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  mode: RaffleMode,
) {
  await transaction.insert(raffleSessions).values({ mode }).onConflictDoNothing();
  await transaction.execute(sql`select mode from raffle_sessions where mode = ${mode} for update`);
}

async function bumpRevision(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  mode: RaffleMode,
) {
  await transaction
    .update(raffleSessions)
    .set({ revision: sql`${raffleSessions.revision} + 1`, updatedAt: new Date() })
    .where(eq(raffleSessions.mode, mode));
}

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

export async function getRaffleState(mode: RaffleMode): Promise<RaffleState> {
  const database = getDatabase();
  const alreadyDrawn = database
    .select({ id: raffleDraws.id })
    .from(raffleDraws)
    .where(and(eq(raffleDraws.registrationId, registrations.id), eq(raffleDraws.mode, mode)));

  const [eligibleRows, drawRows, sessionRows] = await Promise.all([
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
      .where(eq(raffleDraws.mode, mode))
      .orderBy(desc(raffleDraws.createdAt)),
    database.select().from(raffleSessions).where(eq(raffleSessions.mode, mode)).limit(1),
  ]);

  const draws = drawRows.map(toDrawView);
  const highestRound = draws.reduce((highest, draw) => Math.max(highest, draw.roundNumber), 0);
  const activeDraw = draws.find((draw) => draw.status === "selected");
  const latestConfirmedDraw = draws.find((draw) => draw.status === "confirmed");
  return {
    mode,
    revision: sessionRows[0]?.revision ?? 0,
    eligibleCount: eligibleRows[0]?.value ?? 0,
    drawnCount: draws.length,
    confirmedCount: draws.filter((draw) => draw.status === "confirmed").length,
    nextRoundNumber: highestRound + 1,
    current: activeDraw ?? latestConfirmedDraw ?? null,
    history: draws.filter((draw) => draw.status === "confirmed"),
  };
}

export async function startRaffleDraw(mode: RaffleMode) {
  return getDatabase().transaction(async (transaction) => {
    await lockRaffleSession(transaction, mode);

    const [active] = await transaction
      .select({ id: raffleDraws.id })
      .from(raffleDraws)
      .where(and(eq(raffleDraws.mode, mode), eq(raffleDraws.status, "selected")))
      .limit(1);
    if (active) return { kind: "active_exists" as const };

    const drawnRegistration = transaction
      .select({ id: raffleDraws.id })
      .from(raffleDraws)
      .where(and(eq(raffleDraws.registrationId, registrations.id), eq(raffleDraws.mode, mode)));
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
      .from(raffleDraws)
      .where(eq(raffleDraws.mode, mode));
    await transaction.insert(raffleDraws).values({
      id: randomUUID(),
      roundNumber: (round?.value ?? 0) + 1,
      mode,
      registrationId: winner.id,
      status: "selected",
    });
    await bumpRevision(transaction, mode);
    return { kind: "selected" as const };
  });
}

export async function confirmRaffleDraw(mode: RaffleMode, drawId: string) {
  return getDatabase().transaction(async (transaction) => {
    await lockRaffleSession(transaction, mode);
    const [confirmed] = await transaction
      .update(raffleDraws)
      .set({ status: "confirmed", resolvedAt: new Date() })
      .where(and(eq(raffleDraws.id, drawId), eq(raffleDraws.mode, mode), eq(raffleDraws.status, "selected")))
      .returning({ id: raffleDraws.id });
    if (confirmed) await bumpRevision(transaction, mode);
    return confirmed ? { kind: "confirmed" as const } : { kind: "not_selected" as const };
  });
}

export async function redrawRaffleDraw(mode: RaffleMode, drawId: string) {
  return getDatabase().transaction(async (transaction) => {
    await lockRaffleSession(transaction, mode);
    const [current] = await transaction
      .select({ id: raffleDraws.id, roundNumber: raffleDraws.roundNumber })
      .from(raffleDraws)
      .where(and(eq(raffleDraws.id, drawId), eq(raffleDraws.mode, mode), eq(raffleDraws.status, "selected")))
      .limit(1);
    if (!current) return { kind: "not_selected" as const };

    const drawnRegistration = transaction
      .select({ id: raffleDraws.id })
      .from(raffleDraws)
      .where(and(eq(raffleDraws.registrationId, registrations.id), eq(raffleDraws.mode, mode)));
    const candidates = await transaction
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.status, "checked_in"), notExists(drawnRegistration)))
      .orderBy(registrations.id);
    const replacement = pickRandomCandidate(candidates);
    if (!replacement) return { kind: "no_eligible" as const };

    await transaction
      .update(raffleDraws)
      .set({ status: "redrawn", resolvedAt: new Date() })
      .where(eq(raffleDraws.id, current.id));

    await transaction.insert(raffleDraws).values({
      id: randomUUID(),
      roundNumber: current.roundNumber,
      mode,
      registrationId: replacement.id,
      status: "selected",
    });
    await bumpRevision(transaction, mode);
    return { kind: "redrawn" as const };
  });
}

export async function resetRaffle(mode: RaffleMode) {
  return getDatabase().transaction(async (transaction) => {
    await lockRaffleSession(transaction, mode);
    await transaction.delete(raffleDraws).where(eq(raffleDraws.mode, mode));
    await bumpRevision(transaction, mode);
    return { kind: "reset" as const };
  });
}
