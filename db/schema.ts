import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
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

export const raffleDrawStatus = pgEnum("raffle_draw_status", [
  "selected",
  "confirmed",
  "redrawn",
]);

export const raffleMode = pgEnum("raffle_mode", ["rehearsal", "live"]);

export const raffleSessions = pgTable("raffle_sessions", {
  mode: raffleMode("mode").primaryKey(),
  revision: integer("revision").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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

export const raffleDraws = pgTable(
  "raffle_draws",
  {
    id: uuid("id").primaryKey(),
    roundNumber: integer("round_number").notNull(),
    mode: raffleMode("mode").notNull().default("live"),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "restrict" }),
    status: raffleDrawStatus("status").notNull().default("selected"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("raffle_draws_mode_registration_unique").on(table.mode, table.registrationId),
    index("raffle_draws_round_idx").on(table.roundNumber),
    index("raffle_draws_status_idx").on(table.status),
    uniqueIndex("raffle_draws_round_active_unique")
      .on(table.mode, table.roundNumber)
      .where(sql`${table.status} in ('selected', 'confirmed')`),
  ],
);

export type RaffleDraw = typeof raffleDraws.$inferSelect;
export type NewRaffleDraw = typeof raffleDraws.$inferInsert;
