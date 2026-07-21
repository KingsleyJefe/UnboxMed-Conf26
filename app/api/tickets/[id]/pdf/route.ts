import { NextResponse } from "next/server";
import { formatTicketCode, getAppUrl, ticketIdSchema } from "@/lib/registration";
import { getRegistrationById } from "@/lib/registrations";
import { createTicketPdf } from "@/lib/tickets/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ticketIdSchema.safeParse(id).success) {
    return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
  }

  const registration = await getRegistrationById(id);
  if (!registration || registration.status === "void") {
    return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
  }

  const pdf = await createTicketPdf(registration, getAppUrl(request.url));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${formatTicketCode(registration.ticketNumber)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
