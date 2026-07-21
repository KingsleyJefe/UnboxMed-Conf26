import type { Registration } from "@/db/schema";
import { formatTicketCode } from "@/lib/registration";
import { siteConfig } from "@/lib/site-config";
import { createCalendarFile } from "./calendar";
import { createTicketPdf } from "./render";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

async function sendRequest(body: unknown, apiKey: string, secretKey: string) {
  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Basic ${credentials}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Mailjet returned ${response.status}.`);
  }
}

export async function sendTicketEmail(registration: Registration, appUrl: string) {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const senderEmail = process.env.MAILJET_SENDER_EMAIL;
  if (!apiKey || !secretKey || !senderEmail) return false;

  const ticketCode = formatTicketCode(registration.ticketNumber);
  const ticketUrl = `${appUrl}/ticket/${registration.id}`;
  const [pdf, calendar] = await Promise.all([
    createTicketPdf(registration, appUrl),
    Promise.resolve(createCalendarFile()),
  ]);
  const safeName = escapeHtml(registration.name);

  const body = {
    Messages: [
      {
        From: {
          Email: senderEmail,
          Name: process.env.MAILJET_SENDER_NAME ?? siteConfig.eventName,
        },
        To: [{ Email: registration.email, Name: registration.name }],
        Subject: `${ticketCode}: Your UnboxMed Conference ticket`,
        TextPart: `Your seat is saved, ${registration.name}. Your ticket ${ticketCode} is attached. Join us on 15 August 2026, 10AM-2PM at ${siteConfig.venue}. View your ticket: ${ticketUrl}`,
        HTMLPart: `
          <div style="background:#fffaf3;padding:32px;font-family:Arial,sans-serif;color:#2b0a00">
            <div style="max-width:600px;margin:auto;background:#431000;color:#fffaf3;border-radius:22px;padding:34px">
              <p style="color:#e8572a;font-weight:700;letter-spacing:.08em">${escapeHtml(siteConfig.theme)}</p>
              <h1 style="margin:0 0 18px;font-size:34px">Your seat is saved, ${safeName}.</h1>
              <p style="line-height:1.6">Your ticket <strong>${ticketCode}</strong> is attached. Keep the QR code ready on your phone when you arrive.</p>
              <p style="line-height:1.6"><strong>15 August 2026 | 10AM-2PM</strong><br>${escapeHtml(siteConfig.venue)}</p>
              <a href="${ticketUrl}" style="display:inline-block;margin-top:12px;padding:14px 20px;border-radius:999px;background:#e8572a;color:white;text-decoration:none;font-weight:700">View my ticket</a>
            </div>
          </div>`,
        Attachments: [
          {
            ContentType: "application/pdf",
            Filename: `${ticketCode}.pdf`,
            Base64Content: pdf.toString("base64"),
          },
          {
            ContentType: "text/calendar; charset=utf-8; method=PUBLISH",
            Filename: "unboxmed-conference-2026.ics",
            Base64Content: Buffer.from(calendar).toString("base64"),
          },
        ],
      },
    ],
  };

  try {
    await sendRequest(body, apiKey, secretKey);
    return true;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      await sendRequest(body, apiKey, secretKey);
      return true;
    } catch (error) {
      console.error("Ticket email delivery failed.", error);
      return false;
    }
  }
}
