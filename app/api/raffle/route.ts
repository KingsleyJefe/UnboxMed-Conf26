import { NextResponse } from "next/server";
import { z } from "zod";
import {
  confirmRaffleDraw,
  getRaffleState,
  redrawRaffleDraw,
  resetRaffle,
  startRaffleDraw,
} from "@/lib/raffle";
import { hasStaffSession } from "@/lib/staff-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modeSchema = z.enum(["rehearsal", "live"]);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("draw"), mode: modeSchema }),
  z.object({ action: z.literal("confirm"), mode: modeSchema, drawId: z.string().uuid() }),
  z.object({ action: z.literal("redraw"), mode: modeSchema, drawId: z.string().uuid() }),
  z.object({ action: z.literal("reset"), mode: z.literal("rehearsal") }),
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  if (!(await hasStaffSession())) return json({ message: "Staff access required." }, 401);
  try {
    const mode = new URL(request.url).searchParams.get("mode") === "live" ? "live" : "rehearsal";
    return json(await getRaffleState(mode));
  } catch (error) {
    console.error("Could not load raffle state", error);
    return json({ message: "Could not load the raffle." }, 500);
  }
}

export async function POST(request: Request) {
  if (!(await hasStaffSession())) return json({ message: "Staff access required." }, 401);
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Invalid raffle action." }, 400);

  try {
    const action = parsed.data;
    const outcome = action.action === "draw"
      ? await startRaffleDraw(action.mode)
      : action.action === "confirm"
        ? await confirmRaffleDraw(action.mode, action.drawId)
        : action.action === "redraw"
          ? await redrawRaffleDraw(action.mode, action.drawId)
          : await resetRaffle(action.mode);

    if (outcome.kind === "active_exists") return json({ message: "Confirm or redraw the current selection first.", state: await getRaffleState(action.mode) }, 409);
    if (outcome.kind === "no_eligible") return json({ message: "There are no eligible checked-in attendees left.", state: await getRaffleState(action.mode) }, 409);
    if (outcome.kind === "not_selected") return json({ message: "That draw is no longer awaiting a decision. The latest state has been restored.", state: await getRaffleState(action.mode) }, 409);
    return json({ result: outcome.kind, state: await getRaffleState(action.mode) });
  } catch (error) {
    console.error("Could not complete raffle action", error);
    return json({ message: "Could not complete that raffle action." }, 500);
  }
}
