import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase() {
  if (database) return database;

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  const client = postgres(connectionString, {
    // Raffle state loads run two independent queries concurrently, while the
    // host and stage displays poll at the same time. Keep a small pool so those
    // reads do not queue behind one another or behind a draw transaction.
    max: 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  database = drizzle(client, { schema });
  return database;
}
