import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { registrations } from "@/db/schema";
import {
  formatTicketCode,
  getAppUrl,
  isUniqueViolation,
  registrationInputSchema,
} from "@/lib/registration";
import { siteConfig } from "@/lib/site-config";
import { sendTicketEmail } from "@/lib/tickets/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!siteConfig.registrationOpen) {
    return NextResponse.json({ message: "Registration is currently closed." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = registrationInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const [registration] = await getDatabase()
      .insert(registrations)
      .values({ id: randomUUID(), ...parsed.data })
      .returning();

    const appUrl = getAppUrl(request.url);
    let emailSent = false;
    try {
      emailSent = await sendTicketEmail(registration, appUrl);
    } catch (emailError) {
      console.error("Ticket generation or email delivery failed.", emailError);
    }
    const ticketUrl = `${appUrl}/ticket/${registration.id}?email=${emailSent ? "sent" : "failed"}`;

    return NextResponse.json(
      {
        ticketId: registration.id,
        ticketCode: formatTicketCode(registration.ticketNumber),
        ticketUrl,
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { message: "That email already has a ticket. Check its inbox for the confirmation." },
        { status: 409 },
      );
    }

    console.error("Registration creation failed.", error);
    return NextResponse.json(
      { message: "We could not save your seat. Please try again shortly." },
      { status: 500 },
    );
  }
}
