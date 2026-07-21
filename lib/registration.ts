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

export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export function formatTicketCode(ticketNumber: number) {
  return `${siteConfig.ticketPrefix}-${String(ticketNumber).padStart(3, "0")}`;
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
