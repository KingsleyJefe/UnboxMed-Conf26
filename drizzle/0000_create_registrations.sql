DO $$ BEGIN
  CREATE TYPE "registration_status" AS ENUM ('valid', 'checked_in', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "registrations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "ticket_number" bigint GENERATED ALWAYS AS IDENTITY (START WITH 1) NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "status" "registration_status" DEFAULT 'valid' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "checked_in_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "registrations_ticket_number_unique"
  ON "registrations" USING btree ("ticket_number");
CREATE UNIQUE INDEX IF NOT EXISTS "registrations_email_lower_unique"
  ON "registrations" USING btree (lower("email"));
CREATE INDEX IF NOT EXISTS "registrations_status_idx"
  ON "registrations" USING btree ("status");

ALTER TABLE "registrations" ENABLE ROW LEVEL SECURITY;
