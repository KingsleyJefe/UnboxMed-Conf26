"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./TicketButton.module.css";

export function TicketButton({
  className = "",
  label = "Get my ticket",
  surface = "dark",
  href = "/",
  onClick,
}: {
  className?: string;
  label?: string;
  surface?: "dark" | "light";
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className={`${styles.shell} ${styles[surface]} ${className}`}
      whileHover={reduceMotion ? undefined : { scale: 1.045, rotate: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
    >
      <Link className={styles.link} href={href} onClick={onClick}>
        {label}
      </Link>
    </motion.span>
  );
}
