DO $$ BEGIN
  CREATE TYPE "raffle_draw_status" AS ENUM ('selected', 'confirmed', 'redrawn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "raffle_draws" (
  "id" uuid PRIMARY KEY NOT NULL,
  "round_number" integer NOT NULL,
  "registration_id" uuid NOT NULL,
  "status" "raffle_draw_status" DEFAULT 'selected' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "raffle_draws_registration_id_registrations_id_fk"
    FOREIGN KEY ("registration_id") REFERENCES "registrations"("id")
    ON DELETE restrict ON UPDATE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "raffle_draws_registration_unique"
  ON "raffle_draws" USING btree ("registration_id");
CREATE INDEX IF NOT EXISTS "raffle_draws_round_idx"
  ON "raffle_draws" USING btree ("round_number");
CREATE INDEX IF NOT EXISTS "raffle_draws_status_idx"
  ON "raffle_draws" USING btree ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "raffle_draws_round_active_unique"
  ON "raffle_draws" USING btree ("round_number")
  WHERE "status" IN ('selected', 'confirmed');

ALTER TABLE "raffle_draws" ENABLE ROW LEVEL SECURITY;
