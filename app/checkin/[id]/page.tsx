import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConferenceLogo } from "@/components/ConferenceLogo";
import { formatTicketCode, ticketIdSchema } from "@/lib/registration";
import { getRegistrationById } from "@/lib/registrations";
import styles from "./checkin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Present ticket at check-in",
  robots: { index: false, follow: false },
};

export default async function CheckinTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ticketIdSchema.safeParse(id).success) notFound();
  const registration = await getRegistrationById(id);
  if (!registration || registration.status === "void") notFound();

  return (
    <main className={styles.page}>
      <Link href="/" aria-label="Return to the conference home page">
        <ConferenceLogo />
      </Link>
      <section className={styles.card}>
        <span>{formatTicketCode(registration.ticketNumber)}</span>
        <h1>Hold this screen up for the event team.</h1>
        <p>Opening a ticket never checks it in. Only the staff scanner can admit an attendee.</p>
        <Image
          src={`/api/tickets/${id}/image`}
          width={1080}
          height={1350}
          alt={`Digital ticket for ${registration.name}`}
          unoptimized
        />
      </section>
    </main>
  );
}
