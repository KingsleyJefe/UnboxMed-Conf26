import { describe, expect, it } from "vitest";
import {
  formatTicketCode,
  parseTicketIdentifier,
  registrationInputSchema,
  ticketIdSchema,
} from "@/lib/registration";

describe("registration validation", () => {
  it("normalizes an email and Nigerian phone number", () => {
    const result = registrationInputSchema.parse({
      name: "  Ada Okafor  ",
      email: " ADA@Example.COM ",
      phone: "0801 234 5678",
    });

    expect(result).toEqual({
      name: "Ada Okafor",
      email: "ada@example.com",
      phone: "+2348012345678",
    });
  });

  it("rejects an invalid phone number", () => {
    expect(
      registrationInputSchema.safeParse({
        name: "Ada Okafor",
        email: "ada@example.com",
        phone: "123",
      }).success,
    ).toBe(false);
  });

  it("keeps the public serial separate from UUID validation", () => {
    expect(formatTicketCode(1)).toBe("UC26-001");
    expect(formatTicketCode(1042)).toBe("UC26-1042");
    expect(ticketIdSchema.safeParse("UC26-001").success).toBe(false);
    expect(ticketIdSchema.safeParse("22c7f95a-9c94-4f08-98fe-07f90694e514").success).toBe(true);
  });

  it("accepts both private UUIDs and visible ticket codes for staff check-in", () => {
    expect(parseTicketIdentifier("22c7f95a-9c94-4f08-98fe-07f90694e514")).toEqual({
      kind: "uuid",
      value: "22c7f95a-9c94-4f08-98fe-07f90694e514",
    });
    expect(parseTicketIdentifier(" uc26-008 ")).toEqual({ kind: "ticketNumber", value: 8 });
    expect(parseTicketIdentifier("UC26-000")).toBeNull();
    expect(parseTicketIdentifier("not-a-ticket")).toBeNull();
  });
});
