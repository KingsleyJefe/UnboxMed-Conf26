"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import styles from "./scanner.module.css";

type CheckinResult =
  | { kind: "success"; name: string; ticketCode: string }
  | { kind: "already"; name: string; ticketCode: string; checkedInAt?: string }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractTicketId(value: string) {
  const trimmed = value.trim();
  if (UUID_PATTERN.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.origin !== window.location.origin) return null;
    const match = url.pathname.match(/^\/checkin\/([0-9a-f-]+)\/?$/i);
    return match && UUID_PATTERN.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

function signal(success: boolean) {
  navigator.vibrate?.(success ? [110] : [180, 80, 180]);
  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = success ? 760 : 190;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  } catch {
    // Visual and vibration feedback remain available when audio is blocked.
  }
}

export function StaffScanner({ initiallyAuthenticated }: { initiallyAuthenticated: boolean }) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [loginError, setLoginError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  const checkTicket = useCallback(async (rawValue: string) => {
    if (busyRef.current) return;
    const id = extractTicketId(rawValue);
    if (!id) {
      stopScanner();
      setResult({ kind: "invalid" });
      signal(false);
      return;
    }

    busyRef.current = true;
    stopScanner();
    try {
      const response = await fetch(`/api/checkin/${id}`, { method: "POST" });
      const payload = (await response.json()) as {
        result?: string;
        name?: string;
        ticketCode?: string;
        checkedInAt?: string;
      };

      if (response.status === 401) {
        setAuthenticated(false);
        setResult(null);
        return;
      }
      if (response.ok && payload.name && payload.ticketCode) {
        setResult({ kind: "success", name: payload.name, ticketCode: payload.ticketCode });
        signal(true);
      } else if (response.status === 409 && payload.name && payload.ticketCode) {
        setResult({
          kind: "already",
          name: payload.name,
          ticketCode: payload.ticketCode,
          checkedInAt: payload.checkedInAt,
        });
        signal(false);
      } else {
        setResult({ kind: "invalid" });
        signal(false);
      }
    } catch {
      setResult({ kind: "error", message: "Could not reach the check-in server." });
      signal(false);
    } finally {
      busyRef.current = false;
    }
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    if (!videoRef.current || busyRef.current) return;
    stopScanner();
    setResult(null);
    setCameraError("");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (scanResult) => {
          if (scanResult) void checkTicket(scanResult.getText());
        },
      );
      setScanning(true);
    } catch {
      setCameraError("Camera access failed. Allow camera permission, use HTTPS, or enter the ticket URL below.");
      setScanning(false);
    }
  }, [checkTicket, stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  useEffect(() => {
    if (!authenticated) return;
    const frame = requestAnimationFrame(() => void startScanner());
    return () => cancelAnimationFrame(frame);
  }, [authenticated, startScanner]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pin = new FormData(event.currentTarget).get("pin");
    const response = await fetch("/api/staff/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setLoginError(payload.message ?? "Could not sign in.");
      return;
    }
    setAuthenticated(true);
    setLoginError("");
  }

  async function logout() {
    stopScanner();
    await fetch("/api/staff/session", { method: "DELETE" });
    setAuthenticated(false);
    setResult(null);
  }

  if (!authenticated) {
    return (
      <main className={styles.loginPage}>
        <form className={styles.loginCard} onSubmit={login}>
          <span>UnboxMed staff</span>
          <h1>Check-in access</h1>
          <label>
            Shared staff PIN
            <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" required />
          </label>
          <button type="submit">Open scanner</button>
          <p aria-live="polite">{loginError}</p>
        </form>
      </main>
    );
  }

  return (
    <main className={styles.scannerPage} data-result={result?.kind ?? "idle"}>
      <header>
        <div><span>UC26</span><strong>Staff check-in</strong></div>
        <button type="button" onClick={logout}>Sign out</button>
      </header>

      {result ? (
        <section className={styles.result} aria-live="assertive">
          {result.kind === "success" ? (
            <><span>✓</span><h1>Welcome, {result.name}</h1><strong>{result.ticketCode}</strong></>
          ) : null}
          {result.kind === "already" ? (
            <>
              <span>!</span><h1>Already scanned</h1><strong>{result.name} · {result.ticketCode}</strong>
              <p>{result.checkedInAt ? `Checked in at ${new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" }).format(new Date(result.checkedInAt))}` : "This ticket has already been used."}</p>
            </>
          ) : null}
          {result.kind === "invalid" ? <><span>×</span><h1>Invalid ticket</h1><p>Do not admit this attendee.</p></> : null}
          {result.kind === "error" ? <><span>×</span><h1>Connection error</h1><p>{result.message}</p></> : null}
          <button type="button" onClick={startScanner}>Scan next ticket</button>
        </section>
      ) : (
        <section className={styles.cameraArea}>
          <div className={styles.videoFrame}>
            <video ref={videoRef} muted playsInline aria-label="QR scanner camera preview" />
            <div className={styles.target} aria-hidden="true" />
          </div>
          <button className={styles.startButton} type="button" onClick={startScanner}>
            {scanning ? "Restart camera" : "Start camera"}
          </button>
          <p className={styles.cameraError} aria-live="polite">{cameraError}</p>
          <form
            className={styles.manualForm}
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get("ticket")?.toString() ?? "";
              void checkTicket(value);
            }}
          >
            <label htmlFor="ticket">Camera not working? Paste the ticket URL or UUID.</label>
            <div><input id="ticket" name="ticket" autoCapitalize="none" autoCorrect="off" required /><button type="submit">Check</button></div>
          </form>
        </section>
      )}
    </main>
  );
}
