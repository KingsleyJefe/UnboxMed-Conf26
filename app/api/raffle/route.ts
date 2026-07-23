import { NextResponse } from "next/server";
import { z } from "zod";
import {
  confirmRaffleDraw,
  getRaffleState,
  redrawRaffleDraw,
  startRaffleDraw,
} from "@/lib/raffle";
import { hasStaffSession } from "@/lib/staff-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("draw") }),
  z.object({ action: z.literal("confirm"), drawId: z.string().uuid() }),
  z.object({ action: z.literal("redraw"), drawId: z.string().uuid() }),
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  if (!(await hasStaffSession())) return json({ message: "Staff access required." }, 401);
  try {
    return json(await getRaffleState());
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
    const outcome =
      action.action === "draw"
        ? await startRaffleDraw()
        : action.action === "confirm"
          ? await confirmRaffleDraw(action.drawId)
          : await redrawRaffleDraw(action.drawId);

    if (outcome.kind === "active_exists") {
      return json({
        message: "Confirm or redraw the current selection first.",
        state: await getRaffleState(),
      }, 409);
    }
    if (outcome.kind === "no_eligible") {
      return json({
        message: "There are no eligible checked-in attendees left.",
        state: await getRaffleState(),
      }, 409);
    }
    if (outcome.kind === "not_selected") {
      return json({
        message: "That draw is no longer awaiting a decision. The latest state has been restored.",
        state: await getRaffleState(),
      }, 409);
    }

    return json({ result: outcome.kind, state: await getRaffleState() }, 200);
  } catch (error) {
    console.error("Could not complete raffle action", error);
    return json({ message: "Could not complete that raffle action." }, 500);
  }
}
