import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceLogo } from "@/components/ConferenceLogo";
import { formatTicketCode, ticketIdSchema } from "@/lib/registration";
import { getRegistrationById } from "@/lib/registrations";
import { siteConfig } from "@/lib/site-config";
import styles from "./ticket.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your conference ticket",
  description: "View and download your UnboxMed Conference 2026 ticket.",
  robots: { index: false, follow: false },
};

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { id } = await params;
  const { email } = await searchParams;
  if (!ticketIdSchema.safeParse(id).success) notFound();

  const registration = await getRegistrationById(id);
  if (!registration || registration.status === "void") notFound();

  const ticketCode = formatTicketCode(registration.ticketNumber);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Return to the conference home page">
          <ConferenceLogo />
        </Link>
        <span>{ticketCode}</span>
      </header>

      <section className={styles.intro} aria-labelledby="ticket-title">
        <span className={styles.eyebrow}>Your seat is saved</span>
        <h1 id="ticket-title">See you there, {registration.name}.</h1>
        <p>
          Keep this QR ready when you arrive. Your private check-in ID lives inside it; use the
          shorter <strong>{ticketCode}</strong> when speaking with the event team.
        </p>
        {email === "sent" ? (
          <p className={styles.notice} data-tone="success">A copy has been sent to {registration.email}.</p>
        ) : null}
        {email === "failed" ? (
          <p className={styles.notice} data-tone="warning">
            Your ticket is ready, but the email could not be delivered. Download it below before
            closing this page.
          </p>
        ) : null}
      </section>

      <section className={styles.ticketArea} aria-label="Digital conference ticket">
        {/* The dynamic image contains the attendee name and QR; nearby text supplies an accessible equivalent. */}
        <Image
          className={styles.ticket}
          src={`/api/tickets/${id}/image`}
          alt={`${ticketCode} for ${registration.name}, ${siteConfig.date}, 10AM to 2PM at ${siteConfig.venue}`}
          width={1160}
          height={572}
          unoptimized
        />
        <div className={styles.actions}>
          <a href={`/api/tickets/${id}/image?download=1`} download>
            Download PNG
          </a>
          <a href={`/api/tickets/${id}/pdf`}>Download PDF</a>
          <a href={`/api/tickets/${id}/calendar`}>Add to calendar</a>
        </div>
      </section>

      <Link className={styles.homeLink} href="/">Back to the conference site</Link>
    </main>
  );
}
