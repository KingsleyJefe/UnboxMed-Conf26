export type RaffleDrawStatus = "selected" | "confirmed" | "redrawn";
export type RaffleMode = "rehearsal" | "live";

export type RaffleDrawView = {
  id: string;
  roundNumber: number;
  status: RaffleDrawStatus;
  firstName: string;
  ticketCode: string;
  createdAt: string;
  revealAt: string;
  claimEndsAt: string;
  resolvedAt: string | null;
};

export type RaffleState = {
  mode: RaffleMode;
  revision: number;
  eligibleCount: number;
  drawnCount: number;
  confirmedCount: number;
  nextRoundNumber: number;
  current: RaffleDrawView | null;
  history: RaffleDrawView[];
};

export type RaffleActionResult = {
  result: "selected" | "confirmed" | "redrawn" | "reset";
  state: RaffleState;
};
