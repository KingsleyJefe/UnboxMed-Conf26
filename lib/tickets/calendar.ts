import { siteConfig } from "@/lib/site-config";

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsUtc(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function createCalendarFile() {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const uid = `unboxmed-2026-${siteConfig.dateIso}@unboxmed.com`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UnboxMed//Conference 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsUtc(siteConfig.eventStartIso)}`,
    `DTEND:${toIcsUtc(siteConfig.eventEndIso)}`,
    `SUMMARY:${escapeIcs(`${siteConfig.theme} — ${siteConfig.eventName}`)}`,
    `DESCRIPTION:${escapeIcs(siteConfig.calendarDescription)}`,
    `LOCATION:${escapeIcs(siteConfig.venue)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
