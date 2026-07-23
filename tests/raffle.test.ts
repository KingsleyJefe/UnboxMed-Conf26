import { describe, expect, it, vi } from "vitest";
import { getRaffleFirstName, pickRandomCandidate } from "@/lib/raffle-core";

describe("raffle selection", () => {
  it("selects by candidate position rather than assuming ticket numbers are contiguous", () => {
    const nextIndex = vi.fn(() => 1);
    const selected = pickRandomCandidate(
      [
        { ticketCode: "UC26-001" },
        { ticketCode: "UC26-008" },
        { ticketCode: "UC26-104" },
      ],
      nextIndex,
    );

    expect(nextIndex).toHaveBeenCalledWith(3);
    expect(selected?.ticketCode).toBe("UC26-008");
  });

  it("returns null for an exhausted eligible pool", () => {
    expect(pickRandomCandidate([], vi.fn())).toBeNull();
  });

  it("reveals only the attendee first name", () => {
    expect(getRaffleFirstName("  Adaeze Okafor  ")).toBe("Adaeze");
    expect(getRaffleFirstName(" ")).toBe("Guest");
  });
});
