import { NextResponse } from "next/server";
import { formatTicketCode, getAppUrl, ticketIdSchema } from "@/lib/registration";
import { getRegistrationById } from "@/lib/registrations";
import { createTicketPng } from "@/lib/tickets/render";

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

  const png = await createTicketPng(registration, getAppUrl(request.url));
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${formatTicketCode(registration.ticketNumber)}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
