import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { registrations } from "@/db/schema";
import type { TicketIdentifier } from "@/lib/registration";

export async function getRegistrationById(id: string) {
  const [registration] = await getDatabase()
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1);
  return registration;
}

export async function checkInRegistration(identifier: TicketIdentifier) {
  return getDatabase().transaction(async (transaction) => {
    const checkedInAt = new Date();
    const registrationMatches =
      identifier.kind === "uuid"
        ? eq(registrations.id, identifier.value)
        : eq(registrations.ticketNumber, identifier.value);
    const [updated] = await transaction
      .update(registrations)
      .set({ status: "checked_in", checkedInAt })
      .where(and(registrationMatches, eq(registrations.status, "valid")))
      .returning();

    if (updated) return { kind: "checked_in" as const, registration: updated };

    const [existing] = await transaction
      .select()
      .from(registrations)
      .where(registrationMatches)
      .limit(1);

    if (existing?.status === "checked_in") {
      return { kind: "already_checked_in" as const, registration: existing };
    }

    return { kind: "invalid" as const };
  });
}
