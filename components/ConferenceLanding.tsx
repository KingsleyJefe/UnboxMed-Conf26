"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { siteConfig } from "@/lib/site-config";
import { ConferenceLogo } from "./ConferenceLogo";
import { TicketButton } from "./TicketButton";
import styles from "./ConferenceLanding.module.css";

const reveal = {
  hidden: { opacity: 0, y: 42, filter: "blur(8px)", clipPath: "inset(0 0 100% 0)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    clipPath: "inset(0 0 0% 0)",
  },
};

const staggeredReveal = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.08,
    },
  },
};

const collageAssets = [
  { src: "/images/microphone.png", className: "collageMicrophone", alt: "Microphone" },
  { src: "/images/paper-plane.png", className: "collagePlane", alt: "Paper plane" },
  { src: "/images/movie-popcorn.png", className: "collageMovie", alt: "Movie clapperboard and popcorn" },
  { src: "/images/meatpie.png", className: "collageMeatpie", alt: "Meat pie" },
  { src: "/images/camera.png", className: "collageCamera", alt: "Instant camera" },
  { src: "/images/book-illustration.png", className: "collageBook", alt: "Colorful open book" },
  { src: "/images/crown.png", className: "collageCrown", alt: "Crown" },
  { src: "/images/star.png", className: "collageStar", alt: "Gold star" },
] as const;

export function ConferenceLanding() {
  const rootRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef(0);
  const transitionRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);
  const touchSectionRef = useRef<"hero" | "manifesto" | null>(null);
  const navigateRef = useRef<(index: number) => void>(() => undefined);
  const [navSurface, setNavSurface] = useState<"dark" | "light">("dark");
  const [formStatus, setFormStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageBackground, setPageBackground] = useState("#e0552a");
  const [curtainColor, setCurtainColor] = useState("#ffffff");
  const reduceMotion = useReducedMotion();
  const curtainControls = useAnimationControls();

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 130, damping: 18 });
  const smoothY = useSpring(pointerY, { stiffness: 130, damping: 18 });
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-2, 2]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [2, -2]);

  useEffect(() => {
    const page = rootRef.current;
    if (!page) return;

    const sections = Array.from(page.querySelectorAll<HTMLElement>(":scope > section"));

    function getSectionTop(section: HTMLElement) {
      return window.scrollY + section.getBoundingClientRect().top;
    }

    function syncSection(index: number) {
      const section = sections[index];
      if (!section) return;
      activeIndexRef.current = index;
      const background = section.dataset.transitionColor ?? "#ffffff";
      const surface = (section.dataset.navSurfaceSection ?? "dark") as "dark" | "light";
      setPageBackground(background);
      setNavSurface(surface);
    }

    async function navigateTo(index: number) {
      const targetIndex = Math.max(0, Math.min(sections.length - 1, index));
      if (targetIndex === activeIndexRef.current || transitionRef.current) return;

      const target = sections[targetIndex];
      const background = target.dataset.transitionColor ?? "#ffffff";
      const isHeroHandoff =
        (activeIndexRef.current === 0 && targetIndex === 1) ||
        (activeIndexRef.current === 1 && targetIndex === 0);
      const transitionDirection = targetIndex > activeIndexRef.current ? 1 : -1;

      if (isHeroHandoff) {
        transitionRef.current = true;
        setCurtainColor(background);
      }

      if (isHeroHandoff && !reduceMotion) {
        curtainControls.set({ y: transitionDirection > 0 ? "100%" : "-100%" });
        await curtainControls.start({
          y: "0%",
          transition: { duration: 0.34, ease: [0.76, 0, 0.24, 1] },
        });
      }

      window.scrollTo({
        top: getSectionTop(target),
        behavior: isHeroHandoff || reduceMotion ? "auto" : "smooth",
      });
      syncSection(targetIndex);
      const cleanPageUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", cleanPageUrl);

      if (isHeroHandoff) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        if (!reduceMotion) {
          await curtainControls.start({
            y: transitionDirection > 0 ? "-100%" : "100%",
            transition: { duration: 0.44, ease: [0.76, 0, 0.24, 1] },
          });
          curtainControls.set({ y: transitionDirection > 0 ? "100%" : "-100%" });
        }

        transitionRef.current = false;
      }
    }

    navigateRef.current = navigateTo;

    const hashId = window.location.hash.slice(1);
    const hashIndex = hashId ? sections.findIndex((section) => section.id === hashId) : -1;
    const initialIndex = Math.max(
      0,
      hashIndex >= 0
        ? hashIndex
        : sections.findIndex(
            (section) => Math.abs(getSectionTop(section) - window.scrollY) < window.innerHeight / 2,
          ),
    );
    if (hashIndex >= 0) {
      window.scrollTo({ top: getSectionTop(sections[hashIndex]), behavior: "auto" });
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    syncSection(initialIndex);

    let scrollTimer: ReturnType<typeof setTimeout> | undefined;

    function handleScroll() {
      if (transitionRef.current) return;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const viewportMarker = window.scrollY + window.innerHeight * 0.32;
        let index = 0;
        sections.forEach((section, sectionIndex) => {
          if (getSectionTop(section) <= viewportMarker) index = sectionIndex;
        });
        if (index !== activeIndexRef.current) syncSection(index);
      }, 80);
    }

    function handleWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < 12) return;
      const manifestoTop = getSectionTop(sections[1]);
      const isLeavingHero = activeIndexRef.current === 0 && window.scrollY < window.innerHeight * 0.5;
      const isReturningToHero =
        activeIndexRef.current === 1 && window.scrollY <= manifestoTop + 4;
      if (isLeavingHero && event.deltaY > 0) {
        event.preventDefault();
        navigateTo(1);
      } else if (isReturningToHero && event.deltaY < 0) {
        event.preventDefault();
        navigateTo(0);
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (activeIndexRef.current === 0 && ["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        navigateTo(1);
      } else if (
        activeIndexRef.current === 1 &&
        window.scrollY <= getSectionTop(sections[1]) + 4 &&
        ["ArrowUp", "PageUp"].includes(event.key)
      ) {
        event.preventDefault();
        navigateTo(0);
      }
    }

    function handleTouchStart(event: TouchEvent) {
      if ((event.target as Element).closest("input, button, a")) return;
      const isOnHero = activeIndexRef.current === 0 && window.scrollY < window.innerHeight * 0.5;
      const isAtManifestoStart =
        activeIndexRef.current === 1 && window.scrollY <= getSectionTop(sections[1]) + 4;
      if (!isOnHero && !isAtManifestoStart) return;
      touchStartRef.current = event.touches[0]?.clientY ?? null;
      touchSectionRef.current = isOnHero ? "hero" : "manifesto";
    }

    function handleTouchMove(event: TouchEvent) {
      if (touchStartRef.current === null || touchSectionRef.current === null) return;
      const currentY = event.touches[0]?.clientY ?? touchStartRef.current;
      const delta = touchStartRef.current - currentY;
      const shouldRunCurtainTransition =
        (touchSectionRef.current === "hero" && delta > 0) ||
        (touchSectionRef.current === "manifesto" && delta < 0);
      if (shouldRunCurtainTransition) event.preventDefault();
    }

    function handleTouchEnd(event: TouchEvent) {
      if (touchStartRef.current === null) return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartRef.current;
      const delta = touchStartRef.current - endY;
      const touchSection = touchSectionRef.current;
      touchStartRef.current = null;
      touchSectionRef.current = null;
      if (delta > 42 && touchSection === "hero") navigateTo(1);
      if (delta < -42 && touchSection === "manifesto") navigateTo(0);
    }

    function handleTouchCancel() {
      touchStartRef.current = null;
      touchSectionRef.current = null;
    }

    page.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });
    page.addEventListener("touchstart", handleTouchStart, { passive: true });
    page.addEventListener("touchmove", handleTouchMove, { passive: false });
    page.addEventListener("touchend", handleTouchEnd, { passive: true });
    page.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    window.addEventListener("keydown", handleKeydown);

    return () => {
      page.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      page.removeEventListener("touchstart", handleTouchStart);
      page.removeEventListener("touchmove", handleTouchMove);
      page.removeEventListener("touchend", handleTouchEnd);
      page.removeEventListener("touchcancel", handleTouchCancel);
      window.removeEventListener("keydown", handleKeydown);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [curtainControls, reduceMotion]);

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  function handleSectionNavigation(event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) {
    event.preventDefault();
    const sections = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(":scope > section") ?? []);
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index >= 0) navigateRef.current(index);
  }

  async function handleRegistrationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus("Saving your seat…");
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
        }),
      });
      const result = (await response.json()) as { message?: string; ticketUrl?: string };
      if (!response.ok || !result.ticketUrl) {
        setFormStatus(result.message ?? "We could not save your seat. Please try again.");
        return;
      }
      window.location.assign(result.ticketUrl);
    } catch {
      setFormStatus("Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page} ref={rootRef} style={{ backgroundColor: pageBackground }}>
      <nav className={styles.nav} aria-label="Primary navigation" data-surface={navSurface}>
        <ConferenceLogo dark={navSurface === "light"} />
        <TicketButton
          surface={navSurface}
          href="/"
          onClick={(event) => handleSectionNavigation(event, "register")}
        />
      </nav>

      <motion.div
        className={styles.sectionCurtain}
        initial={{ y: "100%" }}
        animate={curtainControls}
        style={{ backgroundColor: curtainColor }}
        aria-hidden="true"
      />

      <section
        className={styles.hero}
        aria-labelledby="hero-title"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        data-transition-color="#e0552a"
        data-nav-surface-section="dark"
      >
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.envelopeStage}>
          <motion.div
            className={styles.envelopeMotion}
            style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.96 }}
            animate={
              reduceMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    rotateZ: [0, -1.25, 1.1, -0.7, 0.55, 0],
                  }
            }
            transition={{
              opacity: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
              rotateZ: { duration: 0.65, repeat: Infinity, repeatDelay: 3.1, ease: "easeInOut" },
            }}
          >
            <div className={styles.envelope}>
              <Image
                src="/images/conference-envelope.png"
                alt={`${siteConfig.theme} invitation for ${siteConfig.date} at ${siteConfig.venue}`}
                width={1008}
                height={1024}
                sizes="(max-width: 767px) min(88vw, 480px), (max-width: 1199px) min(70vw, 720px), min(46vw, 900px)"
                priority
                unoptimized
                draggable={false}
              />
            </div>
          </motion.div>
        </div>

        <h1 className={styles.visuallyHidden} id="hero-title">
          {siteConfig.theme} — {siteConfig.eventName} 2026
        </h1>

        <motion.a
          className={styles.scrollCue}
          href="/"
          onClick={(event) => handleSectionNavigation(event, "manifesto")}
          animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <span>Scroll down</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v15m-6-6 6 6 6-6" />
          </svg>
        </motion.a>

      </section>

      <section
        className={styles.manifesto}
        id="manifesto"
        aria-labelledby="manifesto-title"
        data-nav-surface-section="light"
        data-transition-color="#ffffff"
      >
        <motion.div
          className={styles.manifestoInner}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: false, amount: 0.18 }}
          variants={staggeredReveal}
        >
          <motion.h2
            className={styles.manifestoLead}
            id="manifesto-title"
            variants={reveal}
            transition={{ duration: 0.6 }}
          >
            {siteConfig.manifesto.lead}
          </motion.h2>

          <div className={styles.manifestoCopy}>
            {siteConfig.manifesto.paragraphs.map((paragraph) => {
              const [highlight, copy] = paragraph.split("|");
              return (
                <motion.p key={paragraph} variants={reveal} transition={{ duration: 0.62 }}>
                  {copy ? <strong>{highlight} if…</strong> : null}
                  {copy ?? highlight}
                </motion.p>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section
        className={styles.closing}
        aria-labelledby="closing-title"
        data-nav-surface-section="dark"
        data-transition-color="#431000"
      >
        <motion.div
          className={styles.closingInner}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={staggeredReveal}
        >
          <motion.h2 id="closing-title" variants={reveal} transition={{ duration: 0.55 }}>
            {siteConfig.closing.title}
          </motion.h2>

          <div className={styles.closingCopy}>
            {siteConfig.closing.paragraphs.map((paragraph, index) => (
              <motion.p key={paragraph} variants={reveal} transition={{ duration: 0.55 }}>
                {index === 0 ? <strong>Beyond the Syllabus</strong> : null}
                {index === 0 ? paragraph.replace("Beyond the Syllabus", "") : paragraph}
              </motion.p>
            ))}
          </div>

          <motion.div className={styles.eventFooter} variants={reveal} transition={{ duration: 0.6 }}>
            <time dateTime={siteConfig.dateIso}>{siteConfig.date}</time>
            <div className={styles.ctaRow}>
              <motion.div
                className={styles.messageSticker}
                animate={reduceMotion ? undefined : { rotate: [-12, -8, -12] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/images/imessage-sticker.png" alt="I’m going, are you?" fill sizes="100px" />
              </motion.div>
              <TicketButton
                href="/"
                onClick={(event) => handleSectionNavigation(event, "register")}
              />
              <motion.div
                className={styles.calendarSticker}
                animate={reduceMotion ? undefined : { y: [0, -6, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src="/images/calendar-sticker.png" alt="Calendar marked for the conference date" fill sizes="100px" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section
        className={styles.expectations}
        aria-labelledby="expectations-title"
        data-nav-surface-section="light"
        data-transition-color="#ffffff"
      >
        <motion.div
          className={styles.expectationsInner}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: false, amount: 0.16 }}
          variants={staggeredReveal}
        >
          <motion.div className={styles.collage} variants={reveal} transition={{ duration: 0.7 }}>
            <Image
              className={styles.collageMat}
              src="/images/cutting-mat.png"
              alt=""
              fill
              sizes="(max-width: 767px) 90vw, 560px"
              unoptimized
            />
            {collageAssets.map((asset, index) => (
              <motion.div
                className={`${styles.collageAsset} ${styles[asset.className]}`}
                key={asset.src}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [0, index % 2 === 0 ? -7 : 6, 0],
                        rotate: [0, index % 2 === 0 ? 2 : -2, 0],
                      }
                }
                transition={{ duration: 3.4 + index * 0.22, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image src={asset.src} alt={asset.alt} fill sizes="140px" unoptimized />
              </motion.div>
            ))}
          </motion.div>

          <div className={styles.expectationsCopy}>
            <motion.div className={styles.expectationsHeading} variants={reveal}>
              <h2 id="expectations-title">What to expect</h2>
              <span className={styles.glasses} aria-hidden="true">
                <Image src="/images/eye-glass.png" alt="" fill sizes="80px" unoptimized />
              </span>
            </motion.div>
            <motion.ul className={styles.expectationTags} variants={staggeredReveal}>
              {siteConfig.expectations.map((item, index) => (
                <motion.li key={item} variants={reveal} data-color={index % 3}>
                  {item}
                </motion.li>
              ))}
            </motion.ul>
            <motion.span className={styles.maybe} variants={reveal}>*Maybe…</motion.span>
            <motion.p variants={reveal}>
              We promise you’ll have lots of fun, and learn a lot while at it—come hang with the cool kids!
            </motion.p>
          </div>
        </motion.div>
      </section>

      <section
        className={styles.speakers}
        aria-labelledby="speakers-title"
        data-nav-surface-section="light"
        data-transition-color="#ffffff"
      >
        <motion.div
          className={styles.speakersInner}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: false, amount: 0.18 }}
          variants={staggeredReveal}
        >
          <motion.h2 id="speakers-title" variants={reveal}>Speakers</motion.h2>
          <motion.p variants={reveal}>{siteConfig.speakersIntro}</motion.p>
          <motion.div className={styles.speakerGrid} variants={staggeredReveal}>
            {siteConfig.speakers.map((speaker, index) => (
              <motion.article
                className={styles.speakerCard}
                key={speaker.name}
                variants={reveal}
                whileHover={reduceMotion ? undefined : { y: -8, rotate: index % 2 ? 0.8 : -0.8 }}
              >
                <div className={styles.speakerPortrait}>
                  <Image
                    src={speaker.image}
                    alt={`Portrait of ${speaker.name}`}
                    fill
                    sizes="(max-width: 767px) 43vw, (max-width: 1199px) 22vw, 260px"
                  />
                  <span className={`${styles.speakerCorner} ${styles.cornerTopLeft}`} aria-hidden="true" />
                  <span className={`${styles.speakerCorner} ${styles.cornerTopRight}`} aria-hidden="true" />
                  <span className={`${styles.speakerCorner} ${styles.cornerBottomLeft}`} aria-hidden="true" />
                  <span className={`${styles.speakerCorner} ${styles.cornerBottomRight}`} aria-hidden="true" />
                </div>
                <h3>{speaker.name}</h3>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section
        className={styles.location}
        aria-labelledby="location-title"
        data-nav-surface-section="light"
        data-transition-color="#ffffff"
      >
        <motion.div
          className={styles.locationInner}
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          variants={staggeredReveal}
        >
          <motion.h2 id="location-title" variants={reveal}>Event Location</motion.h2>
          <motion.div className={styles.venueImage} variants={reveal}>
            <Image
              src="/images/cine-21.png"
              alt="Exterior view of Cine 21 in Aba"
              fill
              sizes="100vw"
              unoptimized
            />
          </motion.div>
          <motion.div className={styles.locationDetails} variants={reveal}>
            <address>{siteConfig.venue}</address>
            <a href={siteConfig.directionsUrl} target="_blank" rel="noreferrer">
              View directions <span aria-hidden="true">↗</span>
            </a>
          </motion.div>
        </motion.div>
      </section>

      <section
        className={styles.registration}
        id="register"
        aria-labelledby="registration-title"
        data-nav-surface-section="dark"
        data-transition-color="#431000"
      >
        {siteConfig.registrationOpen ? (
          <motion.form
            className={styles.registrationForm}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: false, amount: 0.18 }}
            variants={staggeredReveal}
            onSubmit={handleRegistrationSubmit}
            aria-busy={isSubmitting}
          >
            <motion.h2 id="registration-title" variants={reveal}>Save a seat</motion.h2>
            <motion.label variants={reveal}>
              <span>Your name or nickname (we don’t judge)</span>
              <input name="name" autoComplete="name" placeholder="What should we call you?" required />
            </motion.label>
            <motion.label variants={reveal}>
              <span>Email address</span>
              <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </motion.label>
            <motion.label variants={reveal}>
              <span>Phone number</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="e.g. +234 800 000 0000"
                required
              />
            </motion.label>
            <motion.button
              className={styles.registrationButton}
              type="submit"
              disabled={isSubmitting}
              variants={reveal}
              whileHover={reduceMotion ? undefined : { scale: 1.04, rotate: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            >
              {isSubmitting ? "Making your ticket…" : "Get my ticket"}
            </motion.button>
            <p className={styles.formStatus} aria-live="polite">{formStatus}</p>
          </motion.form>
        ) : (
          <motion.div
            className={styles.registrationForm}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: false, amount: 0.18 }}
            variants={staggeredReveal}
          >
            <motion.h2 id="registration-title" variants={reveal}>Registration closed</motion.h2>
            <motion.p variants={reveal}>Registration for this event is currently closed. Thank you for your interest.</motion.p>
            <motion.p variants={reveal}>{siteConfig.closing.title}</motion.p>
            <motion.div variants={reveal}>
              <TicketButton href="/" />
            </motion.div>
          </motion.div>
        )}
      </section>
    </main>
  );
}
