import { NextResponse } from "next/server";
import { ticketIdSchema } from "@/lib/registration";
import { getRegistrationById } from "@/lib/registrations";
import { createCalendarFile } from "@/lib/tickets/calendar";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ticketIdSchema.safeParse(id).success) {
    return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
  }

  const registration = await getRegistrationById(id);
  if (!registration || registration.status === "void") {
    return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
  }

  return new NextResponse(createCalendarFile(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=unboxmed-conference-2026.ics",
      "Cache-Control": "private, no-store",
    },
  });
}
