import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:5432/unboxmed",
  },
  strict: true,
  verbose: true,
});
