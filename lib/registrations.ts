import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { registrations } from "@/db/schema";

export async function getRegistrationById(id: string) {
  const [registration] = await getDatabase()
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1);
  return registration;
}

export async function checkInRegistration(id: string) {
  return getDatabase().transaction(async (transaction) => {
    const checkedInAt = new Date();
    const [updated] = await transaction
      .update(registrations)
      .set({ status: "checked_in", checkedInAt })
      .where(and(eq(registrations.id, id), eq(registrations.status, "valid")))
      .returning();

    if (updated) return { kind: "checked_in" as const, registration: updated };

    const [existing] = await transaction
      .select()
      .from(registrations)
      .where(eq(registrations.id, id))
      .limit(1);

    if (existing?.status === "checked_in") {
      return { kind: "already_checked_in" as const, registration: existing };
    }

    return { kind: "invalid" as const };
  });
}
