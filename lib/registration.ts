import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { siteConfig } from "./site-config";

export const registrationInputSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "Keep your name under 80 characters."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254)
    .transform((email) => email.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .transform((value, context) => {
      const phone = parsePhoneNumberFromString(value, "NG");
      if (!phone?.isValid()) {
        context.addIssue({ code: "custom", message: "Enter a valid phone number." });
        return z.NEVER;
      }
      return phone.number;
    }),
});

export const ticketIdSchema = z.string().uuid();

export type TicketIdentifier =
  | { kind: "uuid"; value: string }
  | { kind: "ticketNumber"; value: number };

export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export function formatTicketCode(ticketNumber: number) {
  return `${siteConfig.ticketPrefix}-${String(ticketNumber).padStart(3, "0")}`;
}

export function parseTicketIdentifier(value: string): TicketIdentifier | null {
  const normalized = value.trim();
  const uuid = ticketIdSchema.safeParse(normalized);
  if (uuid.success) return { kind: "uuid", value: uuid.data };

  const prefix = siteConfig.ticketPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = normalized.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
  if (!match) return null;

  const ticketNumber = Number(match[1]);
  return Number.isSafeInteger(ticketNumber) && ticketNumber > 0
    ? { kind: "ticketNumber", value: ticketNumber }
    : null;
}

export function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

export function getAppUrl(requestUrl?: string) {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}
