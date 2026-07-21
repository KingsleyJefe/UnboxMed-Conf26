import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const registrationStatus = pgEnum("registration_status", [
  "valid",
  "checked_in",
  "void",
]);

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey(),
    ticketNumber: bigint("ticket_number", { mode: "number" })
      .generatedAlwaysAsIdentity({ startWith: 1 })
      .notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    status: registrationStatus("status").notNull().default("valid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("registrations_ticket_number_unique").on(table.ticketNumber),
    uniqueIndex("registrations_email_lower_unique").on(sql`lower(${table.email})`),
    index("registrations_status_idx").on(table.status),
  ],
);

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;
