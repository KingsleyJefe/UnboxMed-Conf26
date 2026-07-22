/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import satori from "satori";
import type { Registration } from "@/db/schema";
import { formatTicketCode } from "@/lib/registration";
import { siteConfig } from "@/lib/site-config";

export const TICKET_WIDTH = 1160;
export const TICKET_HEIGHT = 572;

type TicketAssets = {
  chewy: Buffer;
  geist: Buffer;
  geistBold: Buffer;
  background: string;
  glow: string;
  eventLogo: string;
  patternMark: string;
};

let assetsPromise: Promise<TicketAssets> | undefined;

function asDataUrl(data: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      readFile(join(process.cwd(), "node_modules/@fontsource/chewy/files/chewy-latin-400-normal.woff")),
      readFile(join(process.cwd(), "node_modules/@fontsource/geist/files/geist-latin-400-normal.woff")),
      readFile(join(process.cwd(), "node_modules/@fontsource/geist/files/geist-latin-700-normal.woff")),
      readFile(join(process.cwd(), "public/images/ticket-background.svg")),
      readFile(join(process.cwd(), "public/images/ticket-glow.svg")),
      readFile(join(process.cwd(), "public/images/ticket-bts-logo.png")),
      readFile(join(process.cwd(), "public/images/ticket-pattern-mark.svg")),
    ]).then(([chewy, geist, geistBold, background, glow, eventLogo, patternMark]) => ({
      chewy,
      geist,
      geistBold,
      background: asDataUrl(background, "image/svg+xml"),
      glow: asDataUrl(glow, "image/svg+xml"),
      eventLogo: asDataUrl(eventLogo, "image/png"),
      patternMark: asDataUrl(patternMark, "image/svg+xml"),
    }));
  }
  return assetsPromise;
}

export function getTicketCheckinUrl(registration: Registration, appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/checkin/${registration.id}`;
}

export async function createTicketQrDataUrl(registration: Registration, appUrl: string) {
  return QRCode.toDataURL(getTicketCheckinUrl(registration, appUrl), {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 272,
    color: { dark: "#270900", light: "#fff8f2" },
  });
}

export function getTicketDisplayName(name: string) {
  return (name.trim().split(/\s+/)[0] ?? name.trim()).slice(0, 16);
}

export async function createTicketPng(registration: Registration, appUrl: string) {
  const { chewy, geist, geistBold, background, glow, eventLogo, patternMark } = await loadAssets();
  const ticketCode = formatTicketCode(registration.ticketNumber);
  const qrCode = await createTicketQrDataUrl(registration, appUrl);
  const attendeeFirstName = getTicketDisplayName(registration.name);
  const attendeeFontSize = attendeeFirstName.length > 12 ? 30 : attendeeFirstName.length > 9 ? 36 : 43;

  const svg = await satori(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: TICKET_WIDTH,
        height: TICKET_HEIGHT,
        overflow: "hidden",
        clipPath:
          "path('M 781.484 0 C 785.052 11.651 794.68 20 806 20 C 817.32 20 826.948 11.651 830.516 0 H 1160 V 572 H 836.996 C 832.636 562.484 823.976 556 814 556 C 804.024 556 795.364 562.484 791.004 572 H 0 V 0 Z')",
        color: "#ffffff",
        background: "transparent",
        fontFamily: "Geist",
      }}
    >
      <img
        src={background}
        alt=""
        width={TICKET_WIDTH}
        height={TICKET_HEIGHT}
        style={{ position: "absolute", inset: 0, width: TICKET_WIDTH, height: TICKET_HEIGHT }}
      />
      <img
        src={glow}
        alt=""
        width={812}
        height={900}
        style={{ position: "absolute", left: 52, top: -200, width: 812, height: 900 }}
      />

      <div
        style={{
          position: "absolute",
          left: -28,
          top: 20,
          display: "flex",
          width: 812,
          height: 540,
          flexWrap: "wrap",
          alignContent: "flex-start",
          gap: "20px 32px",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 110 }, (_, index) => (
          <img
            key={index}
            src={patternMark}
            alt=""
            width={45}
            height={36}
            style={{ width: 45, height: 36, opacity: 0.82 }}
          />
        ))}
      </div>

      <img
        src={eventLogo}
        alt=""
        width={216}
        height={81}
        style={{ position: "absolute", left: 80, top: 56, width: 216, height: 81 }}
      />
      <div
        style={{
          position: "absolute",
          left: 328,
          top: 80,
          display: "flex",
          color: "#e0552a",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        {ticketCode}
      </div>

      <div
        style={{
          position: "absolute",
          left: 808,
          top: 48,
          display: "flex",
          width: 2,
          height: 488,
          borderLeft: "2px dashed #2a2828",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 448,
          display: "flex",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <TicketDetail label="DATE" value="AUG 15, 2026" width={160} />
        <TicketDetail label="TIME" value="10AM" width={170} />
        <TicketDetail label="LOCATION" value="Cine 21, #10 Factory Road" width={300} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 872,
          top: 68,
          display: "flex",
          width: 232,
          justifyContent: "center",
          color: "#86371f",
          fontSize: 20,
          letterSpacing: -0.4,
          textTransform: "uppercase",
        }}
      >
        Admit one
      </div>
      <img
        src={qrCode}
        alt=""
        width={272}
        height={272}
        style={{ position: "absolute", left: 852, top: 120, width: 272, height: 272 }}
      />

      <div
        style={{
          position: "absolute",
          left: 872,
          top: 432,
          display: "flex",
          width: 232,
          flexDirection: "column",
          alignItems: "flex-start",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#e0552a",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.3,
            textTransform: "uppercase",
          }}
        >
          Attendee
        </div>
        <div
          style={{
            display: "flex",
            width: 232,
            marginTop: 4,
            overflow: "hidden",
            color: "#ffffff",
            fontFamily: "Chewy",
            fontSize: attendeeFontSize,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {attendeeFirstName}
        </div>
      </div>
    </div>,
    {
      width: TICKET_WIDTH,
      height: TICKET_HEIGHT,
      fonts: [
        { name: "Chewy", data: chewy, weight: 400, style: "normal" },
        { name: "Geist", data: geist, weight: 400, style: "normal" },
        { name: "Geist", data: geistBold, weight: 700, style: "normal" },
      ],
    },
  );

  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: TICKET_WIDTH } }).render().asPng());
}

function TicketDetail({ label, value, width }: { label: string; value: string; width: number }) {
  return (
    <div style={{ display: "flex", width, flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          color: "#e0552a",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          color: "#ffffff",
          fontSize: 23,
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export async function createTicketPdf(registration: Registration, appUrl: string) {
  const png = await createTicketPng(registration, appUrl);
  const document = await PDFDocument.create();
  document.setTitle(`${formatTicketCode(registration.ticketNumber)} - ${siteConfig.eventName}`);
  document.setAuthor(siteConfig.eventName);
  const page = document.addPage([TICKET_WIDTH / 2, TICKET_HEIGHT / 2]);
  const image = await document.embedPng(png);
  page.drawImage(image, { x: 0, y: 0, width: TICKET_WIDTH / 2, height: TICKET_HEIGHT / 2 });
  return Buffer.from(await document.save());
}
