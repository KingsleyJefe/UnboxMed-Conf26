import type { Metadata } from "next";
import Link from "next/link";
import { ConferenceLogo } from "@/components/ConferenceLogo";
import { siteConfig } from "@/lib/site-config";
import styles from "./register.module.css";

export const metadata: Metadata = {
  title: "Registration opening soon",
  description: "Registration for UnboxMed Conference 2026 will open soon.",
};

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Return to the conference home page">
          <ConferenceLogo />
        </Link>
      </header>

      <section className={styles.card} aria-labelledby="registration-title">
        <span className={styles.eyebrow}>Beyond the Syllabus</span>
        <h1 id="registration-title">Your seat is almost ready.</h1>
        <p>
          Registration is opening soon. Save the date—{siteConfig.date} at {siteConfig.venue}.
        </p>
        <Link className={styles.backLink} href="/">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m6-6-6 6 6 6" />
          </svg>
          Back to the conference
        </Link>
      </section>

      <div className={styles.orbit} aria-hidden="true">26</div>
    </main>
  );
}
