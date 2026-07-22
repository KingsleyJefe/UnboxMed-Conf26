import { describe, expect, it } from "vitest";
import type { Registration } from "@/db/schema";
import { createCalendarFile } from "@/lib/tickets/calendar";
import {
  createTicketPdf,
  createTicketPng,
  createTicketQrDataUrl,
  getTicketDisplayName,
  getTicketCheckinUrl,
} from "@/lib/tickets/render";

const registration: Registration = {
  id: "22c7f95a-9c94-4f08-98fe-07f90694e514",
  ticketNumber: 1,
  name: "Ada Okafor",
  email: "ada@example.com",
  phone: "+2348012345678",
  status: "valid",
  createdAt: new Date("2026-07-19T12:00:00Z"),
  checkedInAt: null,
};

describe("ticket artifacts", () => {
  it("uses only the first name and caps it at 16 characters", () => {
    expect(getTicketDisplayName("Ada Okafor")).toBe("Ada");
    expect(getTicketDisplayName("  Christopherlongname Okafor  ")).toBe("Christopherlongn");
  });

  it("creates the correct UTC calendar window", () => {
    const calendar = createCalendarFile();
    expect(calendar).toContain("DTSTART:20260815T090000Z");
    expect(calendar).toContain("DTEND:20260815T130000Z");
    expect(calendar).toContain("Cine 21\\, #10 Factory Rd\\, Aba");
  });

  it("renders PNG and PDF ticket files", async () => {
    const png = await createTicketPng(registration, "https://conference.example");
    expect(png.subarray(1, 4).toString()).toBe("PNG");

    const pdf = await createTicketPdf(registration, "https://conference.example");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 20_000);

  it("generates a private check-in QR for the registration UUID", async () => {
    const appUrl = "https://unboxmedconf.fun";
    expect(getTicketCheckinUrl(registration, appUrl)).toBe(
      `https://unboxmedconf.fun/checkin/${registration.id}`,
    );

    const qrCode = await createTicketQrDataUrl(registration, appUrl);
    expect(qrCode).toMatch(/^data:image\/png;base64,/);
    expect(Buffer.from(qrCode.split(",")[1], "base64").subarray(1, 4).toString()).toBe("PNG");
  });
});
