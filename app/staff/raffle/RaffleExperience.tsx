"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { RaffleActionResult, RaffleDrawView, RaffleMode as RaffleSessionMode, RaffleState } from "@/lib/raffle-types";
import styles from "./raffle.module.css";

type RaffleMode = "host" | "stage";
type RaffleAction =
  | { action: "draw" }
  | { action: "confirm"; drawId: string }
  | { action: "redraw"; drawId: string }
  | { action: "reset" };

const MODE_KEY = "unboxmed_raffle_mode";
const REQUEST_TIMEOUT_MS = 10_000;

const confetti = Array.from({ length: 48 }, (_, index) => ({
  id: index,
  x: ((index * 37) % 100) + (index % 2 ? 2 : -2),
  delay: (index % 12) * 0.045,
  duration: 1.7 + (index % 7) * 0.16,
  rotation: (index * 83) % 360,
  color: ["#fff8f2", "#ffc9b8", "#e8572a", "#ffd43b", "#8d68ff"][index % 5],
}));

function getPhase(current: RaffleDrawView | null, now: number, reduceMotion: boolean) {
  if (!current || current.status === "redrawn") return "idle" as const;
  if (current.status === "confirmed") return "revealed" as const;
  const remaining = new Date(current.revealAt).getTime() - now;
  if (remaining <= 0) return "revealed" as const;
  if (reduceMotion) return "waiting" as const;
  return remaining > 3_000 ? ("cycling" as const) : ("countdown" as const);
}

function playRevealSound() {
  try {
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.75);
    gain.connect(context.destination);
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.085);
      oscillator.stop(context.currentTime + 0.5 + index * 0.085);
    });
    window.setTimeout(() => void context.close(), 1_100);
  } catch {
    // The visual reveal remains complete when Web Audio is unavailable.
  }
}

function StaffLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const pin = new FormData(event.currentTarget).get("pin");
    try {
      const response = await fetch("/api/staff/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Could not sign in.");
        return;
      }
      onAuthenticated();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <form className={styles.loginCard} onSubmit={login}>
        <span>UnboxMed staff</span>
        <h1>Unbox the Winner</h1>
        <p>Use the same staff PIN as check-in.</p>
        <label>
          Shared staff PIN
          <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Opening..." : "Open raffle"}
        </button>
        <strong role="alert">{error}</strong>
      </form>
    </main>
  );
}

function ModePicker({ onChoose, onLogout }: { onChoose: (mode: RaffleMode) => void; onLogout: () => void }) {
  return (
    <main className={styles.modePage}>
      <header className={styles.modeHeader}>
        <span>UC26</span>
        <button type="button" onClick={onLogout}>Sign out</button>
      </header>
      <div className={styles.modePicker}>
        <span>One link. Two views.</span>
        <h1>How are you using this screen?</h1>
        <div className={styles.modeGrid}>
          <button type="button" onClick={() => onChoose("host")}>
            <i>01</i>
            <strong>Host controls</strong>
            <small>Start rounds, confirm winners, redraw, and review history.</small>
          </button>
          <button type="button" onClick={() => onChoose("stage")}>
            <i>02</i>
            <strong>Stage display</strong>
            <small>Fullscreen envelope animation and audience-facing reveal.</small>
          </button>
        </div>
      </div>
    </main>
  );
}

function RaffleHeader({
  mode,
  sessionMode,
  connected,
  onSwitchMode,
  onSwitchSession,
  onLogout,
}: {
  mode: RaffleMode;
  sessionMode: RaffleSessionMode;
  connected: boolean;
  onSwitchMode: () => void;
  onSwitchSession: () => void;
  onLogout: () => void;
}) {
  return (
    <header className={styles.raffleHeader}>
      <div><span>UC26</span><strong>Unbox the Winner</strong></div>
      <div className={styles.headerActions}>
        <button type="button" onClick={onSwitchSession}>{sessionMode === "rehearsal" ? "Rehearsal" : "Live raffle"}</button>
        <span className={styles.connection} data-connected={connected}>{connected ? "Live" : "Reconnecting"}</span>
        <button type="button" onClick={onSwitchMode}>{mode === "host" ? "Stage mode" : "Host mode"}</button>
        <button type="button" onClick={onLogout}>Sign out</button>
      </div>
    </header>
  );
}

function HostView({
  state,
  now,
  busy,
  error,
  onAction,
  onReset,
}: {
  state: RaffleState | null;
  now: number;
  busy: boolean;
  error: string;
  onAction: (action: RaffleAction) => void;
  onReset: () => void;
}) {
  const current = state?.current ?? null;
  const revealed = Boolean(current && new Date(current.revealAt).getTime() <= now);
  const waitingForDecision = current?.status === "selected";
  const claimSeconds = current
    ? Math.max(0, Math.ceil((new Date(current.claimEndsAt).getTime() - now) / 1_000))
    : 0;

  return (
    <div className={styles.hostLayout}>
      <section className={styles.hostHero}>
        <div>
          <span>Live raffle controller</span>
          <h1>Ready to unbox a winner?</h1>
          <p>Every selection comes from attendees who have completed check-in.</p>
        </div>
        <div className={styles.stats}>
          <div><strong>{state?.eligibleCount ?? "--"}</strong><span>Eligible now</span></div>
          <div><strong>{state?.confirmedCount ?? "--"}</strong><span>Winners</span></div>
          <div><strong>{state?.nextRoundNumber ?? "--"}</strong><span>Next round</span></div>
        </div>
      </section>

      <section className={styles.controlPanel}>
        <div className={styles.controlHeading}>
          <span>{current ? `Round ${current.roundNumber}` : `Round ${state?.nextRoundNumber ?? 1}`}</span>
          <strong>{waitingForDecision ? "Selection in progress" : current?.status === "confirmed" ? "Winner confirmed" : "Ready for the next draw"}</strong>
        </div>

        {waitingForDecision ? (
          <div className={styles.activeDraw}>
            {revealed ? (
              <>
                <span>Selected attendee</span>
                <h2>{current.firstName}</h2>
                <strong>{current.ticketCode}</strong>
                <p>{claimSeconds > 0 ? `${claimSeconds}s claim window` : "Waiting for the host's decision"}</p>
              </>
            ) : (
              <>
                <span>Do not announce yet</span>
                <h2>{Math.max(1, Math.ceil((new Date(current.revealAt).getTime() - now) / 1_000))}</h2>
                <strong>The stage is building suspense...</strong>
              </>
            )}
          </div>
        ) : (
          <div className={styles.drawReady}>
            <Image src="/images/conference-envelope.png" alt="Conference envelope" width={1008} height={1024} priority />
            <p>
              {!state
                ? "Loading the checked-in attendee pool..."
                : state.eligibleCount
                  ? `${state.eligibleCount} checked-in attendees are in the pool.`
                  : "No eligible checked-in attendees are currently available."}
            </p>
          </div>
        )}

        <div className={styles.controlActions}>
          {waitingForDecision ? (
            <>
              <button type="button" className={styles.confirmButton} disabled={busy || !revealed} onClick={() => onAction({ action: "confirm", drawId: current.id })}>
                Confirm winner
              </button>
              <button type="button" className={styles.redrawButton} disabled={busy || !revealed} onClick={() => onAction({ action: "redraw", drawId: current.id })}>
                Redraw
              </button>
            </>
          ) : (
            <button type="button" className={styles.drawButton} disabled={busy || !state || !state.eligibleCount} onClick={() => onAction({ action: "draw" })}>
              {busy ? "Selecting..." : `Start round ${state?.nextRoundNumber ?? 1}`}
            </button>
          )}
        </div>
        <p className={styles.actionError} role="alert">{error}</p>
      </section>

      <section className={styles.historyPanel}>
        <div><span>Confirmed winners</span><strong>{state?.history.length ?? 0}</strong></div>
        {state?.mode === "rehearsal" && state.drawnCount > 0 ? <button type="button" disabled={busy} onClick={onReset}>Reset rehearsal</button> : null}
        {state?.history.length ? (
          <ol>
            {state.history.map((draw) => (
              <li key={draw.id}>
                <span>Round {draw.roundNumber}</span>
                <strong>{draw.firstName}</strong>
                <code>{draw.ticketCode}</code>
              </li>
            ))}
          </ol>
        ) : <p>No winners yet. The first round will appear here.</p>}
      </section>
    </div>
  );
}

function StageView({
  state,
  now,
  ready,
  onReady,
}: {
  state: RaffleState | null;
  now: number;
  ready: boolean;
  onReady: () => void;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const current = state?.current ?? null;
  const phase = getPhase(current, now, reduceMotion);
  const [ticker, setTicker] = useState(1);
  const soundedDrawRef = useRef<string | null>(null);
  const claimSeconds = current
    ? Math.max(0, Math.ceil((new Date(current.claimEndsAt).getTime() - now) / 1_000))
    : 0;
  const countdown = current
    ? Math.max(1, Math.ceil((new Date(current.revealAt).getTime() - now) / 1_000))
    : 3;

  useEffect(() => {
    if (phase !== "cycling" && phase !== "countdown") return;
    const interval = window.setInterval(() => setTicker(Math.floor(Math.random() * 999) + 1), 90);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (!ready || phase !== "revealed" || !current || soundedDrawRef.current === current.id) return;
    soundedDrawRef.current = current.id;
    if (Math.abs(Date.now() - new Date(current.revealAt).getTime()) < 2_500) playRevealSound();
  }, [current, phase, ready]);

  if (!ready) {
    return (
      <section className={styles.stageReady}>
        <span>Projector mode</span>
        <h1>Let&apos;s make some noise.</h1>
        <p>One tap enables reveal sounds and requests fullscreen. You can exit fullscreen at any time.</p>
        <button type="button" onClick={onReady}>Enable sound &amp; fullscreen</button>
      </section>
    );
  }

  return (
    <section className={styles.stage} data-phase={phase} aria-live="polite">
      <div className={styles.stagePattern} aria-hidden="true" />
      <AnimatePresence mode="wait">
        {phase === "idle" || !current ? (
          <motion.div className={styles.stageIdle} key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span>UnboxMed Conference 2026</span>
            <h1>Unbox the Winner</h1>
            <p>{state?.eligibleCount ?? 0} checked-in attendees are ready.</p>
          </motion.div>
        ) : null}

        {current && (phase === "cycling" || phase === "countdown" || phase === "waiting") ? (
          <motion.div className={styles.stageSelecting} key={current.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.08 }}>
            <span className={styles.roundLabel}>Round {current.roundNumber}</span>
            <motion.div
              className={styles.stageEnvelope}
              animate={reduceMotion ? undefined : { rotate: [0, -1.8, 1.7, -1.2, 1, 0], x: [0, -5, 5, -4, 3, 0] }}
              transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image src="/images/conference-envelope.png" alt="The raffle envelope is opening" width={1008} height={1024} priority />
            </motion.div>
            <div className={styles.codeTicker}>{phase === "countdown" ? countdown : `UC26-${String(ticker).padStart(3, "0")}`}</div>
            <p>{phase === "countdown" ? "Get ready..." : "Shuffling checked-in tickets"}</p>
          </motion.div>
        ) : null}

        {current && phase === "revealed" ? (
          <motion.div className={styles.stageWinner} key={`winner-${current.id}`} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 160, damping: 14 }}>
            <span>Round {current.roundNumber} winner</span>
            <h1>{current.firstName}</h1>
            <strong>{current.ticketCode}</strong>
            <p>{current.status === "confirmed" ? "Winner confirmed!" : claimSeconds > 0 ? `Come forward - ${claimSeconds}s` : "Host, confirm or redraw"}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {phase === "revealed" && !reduceMotion ? (
        <div className={styles.confetti} aria-hidden="true">
          {confetti.map((piece) => (
            <i
              key={`${current?.id}-${piece.id}`}
              style={{
                "--x": `${piece.x}vw`,
                "--delay": `${piece.delay}s`,
                "--duration": `${piece.duration}s`,
                "--rotation": `${piece.rotation}deg`,
                "--color": piece.color,
              } as CSSProperties}
            />
          ))}
        </div>
      ) : null}
      <div className={styles.stageFooter}><span>Beyond the Syllabus</span><strong>{state?.eligibleCount ?? 0} tickets remain</strong></div>
    </section>
  );
}

export function RaffleExperience({ initiallyAuthenticated }: { initiallyAuthenticated: boolean }) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [mode, setMode] = useState<RaffleMode | null>(null);
  const [sessionMode, setSessionMode] = useState<RaffleSessionMode>("rehearsal");
  const [state, setState] = useState<RaffleState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.sessionStorage.getItem(MODE_KEY);
      if (saved === "host" || saved === "stage") setMode(saved);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authenticated || !mode) return;
    const events = new EventSource(`/api/raffle/events?mode=${sessionMode}`);
    const onState = (event: MessageEvent<string>) => {
      setState(JSON.parse(event.data) as RaffleState);
      setConnected(true);
    };
    events.addEventListener("state", onState as EventListener);
    events.onerror = () => setConnected(false);
    return () => {
      events.close();
    };
  }, [authenticated, mode, sessionMode]);

  const chooseMode = useCallback((nextMode: RaffleMode) => {
    window.sessionStorage.setItem(MODE_KEY, nextMode);
    setMode(nextMode);
    setStageReady(false);
  }, []);

  const switchMode = useCallback(() => {
    window.sessionStorage.removeItem(MODE_KEY);
    setMode(null);
    setStageReady(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/staff/session", { method: "DELETE" }).catch(() => undefined);
    window.sessionStorage.removeItem(MODE_KEY);
    setAuthenticated(false);
    setMode(null);
    setState(null);
  }, []);

  const runAction = useCallback(async (action: RaffleAction) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/raffle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...action, mode: sessionMode }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as RaffleActionResult & { message?: string };
      if (response.status === 401) {
        setAuthenticated(false);
        setMode(null);
        return;
      }
      if (payload.state) {
        setState(payload.state);
        setConnected(true);
      }
      if (!response.ok || !payload.state) {
        setError(payload.message ?? "Could not complete that action.");
        return;
      }
    } catch {
      setError(controller.signal.reason === "timeout" ? "The raffle server took too long. Please try again." : "Could not reach the raffle server.");
      setConnected(false);
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }, [busy, sessionMode]);

  const resetRehearsal = useCallback(async () => {
    if (sessionMode !== "rehearsal" || !window.confirm("Reset all rehearsal draws? Live raffle data will not be affected.")) return;
    await runAction({ action: "reset" });
  }, [runAction, sessionMode]);

  const switchSession = useCallback(() => {
    setState(null);
    setConnected(false);
    setSessionMode((current) => current === "rehearsal" ? "live" : "rehearsal");
    setStageReady(false);
  }, []);

  const enableStage = useCallback(async () => {
    setStageReady(true);
    try {
      const context = new AudioContext();
      await context.resume();
      await context.close();
    } catch {
      // Full visual mode remains available without sound.
    }
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen is optional and can be blocked by browser/device policy.
    }
  }, []);

  const authenticatedHandler = useCallback(() => setAuthenticated(true), []);
  const content = useMemo(() => {
    if (!authenticated) return <StaffLogin onAuthenticated={authenticatedHandler} />;
    if (!mode) return <ModePicker onChoose={chooseMode} onLogout={logout} />;
    return (
      <main className={styles.rafflePage} data-mode={mode}>
        <RaffleHeader mode={mode} sessionMode={sessionMode} connected={connected} onSwitchMode={switchMode} onSwitchSession={switchSession} onLogout={logout} />
        {mode === "host" ? (
          <HostView state={state} now={now} busy={busy} error={error} onAction={runAction} onReset={resetRehearsal} />
        ) : (
          <StageView state={state} now={now} ready={stageReady} onReady={enableStage} />
        )}
      </main>
    );
  }, [authenticated, authenticatedHandler, busy, chooseMode, connected, enableStage, error, logout, mode, now, resetRehearsal, runAction, sessionMode, stageReady, state, switchMode, switchSession]);

  return content;
}
