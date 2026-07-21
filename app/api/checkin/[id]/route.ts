import { NextResponse } from "next/server";
import { formatTicketCode, parseTicketIdentifier } from "@/lib/registration";
import { checkInRegistration } from "@/lib/registrations";
import { hasStaffSession } from "@/lib/staff-session";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasStaffSession())) {
    return NextResponse.json({ result: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const identifier = parseTicketIdentifier(id);
  if (!identifier) {
    return NextResponse.json({ result: "invalid" }, { status: 404 });
  }

  const outcome = await checkInRegistration(identifier);
  if (outcome.kind === "invalid") {
    return NextResponse.json({ result: "invalid" }, { status: 404 });
  }

  const payload = {
    result: outcome.kind,
    name: outcome.registration.name,
    ticketCode: formatTicketCode(outcome.registration.ticketNumber),
    checkedInAt: outcome.registration.checkedInAt?.toISOString(),
  };

  return NextResponse.json(payload, {
    status: outcome.kind === "checked_in" ? 200 : 409,
  });
}
