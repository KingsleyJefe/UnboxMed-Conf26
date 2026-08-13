DO $$ BEGIN
  CREATE TYPE "raffle_mode" AS ENUM ('rehearsal', 'live');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "raffle_sessions" (
  "mode" "raffle_mode" PRIMARY KEY NOT NULL,
  "revision" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "raffle_sessions" ("mode") VALUES ('rehearsal'), ('live')
ON CONFLICT ("mode") DO NOTHING;

ALTER TABLE "raffle_draws"
  ADD COLUMN IF NOT EXISTS "mode" "raffle_mode" DEFAULT 'live' NOT NULL;

DROP INDEX IF EXISTS "raffle_draws_registration_unique";
DROP INDEX IF EXISTS "raffle_draws_round_active_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "raffle_draws_mode_registration_unique"
  ON "raffle_draws" USING btree ("mode", "registration_id");
CREATE UNIQUE INDEX IF NOT EXISTS "raffle_draws_round_active_unique"
  ON "raffle_draws" USING btree ("mode", "round_number")
  WHERE "status" IN ('selected', 'confirmed');

ALTER TABLE "raffle_sessions" ENABLE ROW LEVEL SECURITY;
