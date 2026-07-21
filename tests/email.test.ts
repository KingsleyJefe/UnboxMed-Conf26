import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Registration } from "@/db/schema";
import { sendTicketEmail } from "@/lib/tickets/email";

vi.mock("@/lib/tickets/render", () => ({
  createTicketPdf: vi.fn(async () => Buffer.from("pdf-ticket")),
}));

vi.mock("@/lib/tickets/calendar", () => ({
  createCalendarFile: vi.fn(() => "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"),
}));

const registration: Registration = {
  id: "22c7f95a-9c94-4f08-98fe-07f90694e514",
  ticketNumber: 1,
  name: "Ada <Okafor>",
  email: "ada@example.com",
  phone: "+2348012345678",
  status: "valid",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  checkedInAt: null,
};

describe("Mailjet ticket email", () => {
  beforeEach(() => {
    process.env.MAILJET_API_KEY = "public-key";
    process.env.MAILJET_SECRET_KEY = "secret-key";
    process.env.MAILJET_SENDER_EMAIL = "host@example.com";
    process.env.MAILJET_SENDER_NAME = "UnboxMed Tickets";
  });

  afterEach(() => {
    delete process.env.MAILJET_API_KEY;
    delete process.env.MAILJET_SECRET_KEY;
    delete process.env.MAILJET_SENDER_EMAIL;
    delete process.env.MAILJET_SENDER_NAME;
    vi.unstubAllGlobals();
  });

  it("sends the ticket and calendar using Mailjet v3.1", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendTicketEmail(registration, "https://example.vercel.app")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.mailjet.com/v3.1/send");
    expect(new Headers(options?.headers).get("authorization")).toBe(
      `Basic ${Buffer.from("public-key:secret-key").toString("base64")}`,
    );

    const payload = JSON.parse(String(options?.body));
    const message = payload.Messages[0];
    expect(message.From).toEqual({ Email: "host@example.com", Name: "UnboxMed Tickets" });
    expect(message.To).toEqual([{ Email: "ada@example.com", Name: "Ada <Okafor>" }]);
    expect(message.Subject).toContain("UC26-001");
    expect(message.HTMLPart).toContain("Ada &lt;Okafor&gt;");
    expect(message.Attachments).toEqual([
      expect.objectContaining({ ContentType: "application/pdf", Filename: "UC26-001.pdf" }),
      expect.objectContaining({
        ContentType: "text/calendar; charset=utf-8; method=PUBLISH",
        Filename: "unboxmed-conference-2026.ics",
      }),
    ]);
  });

  it("skips delivery when Mailjet credentials are incomplete", async () => {
    delete process.env.MAILJET_SECRET_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendTicketEmail(registration, "https://example.vercel.app")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
