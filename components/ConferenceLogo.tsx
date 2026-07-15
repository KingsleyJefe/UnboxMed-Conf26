import styles from "./ConferenceLogo.module.css";

export function ConferenceLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`${styles.logo} ${dark ? styles.dark : ""}`}
      role="img"
      aria-label="UnboxMed Conference"
    >
      <span className={styles.mark} aria-hidden="true" />
    </span>
  );
}
