import { randomInt } from "node:crypto";

export const RAFFLE_REVEAL_DELAY_MS = 6_000;
export const RAFFLE_CLAIM_WINDOW_MS = 30_000;

export function getRaffleFirstName(name: string) {
  return name.trim().split(/\s+/)[0]?.slice(0, 24) || "Guest";
}

export function pickRandomCandidate<T>(
  candidates: readonly T[],
  nextIndex: (maximum: number) => number = randomInt,
) {
  if (candidates.length === 0) return null;
  return candidates[nextIndex(candidates.length)];
}
