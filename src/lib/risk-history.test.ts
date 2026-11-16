import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT } from "./heart-model";
import { buildHistoryDigest, formatPoints, pointsChange, type SavedCheck } from "./risk-history";

const check = (id: string, createdAt: string, probability: number, bp: number): SavedCheck => ({
  id,
  createdAt,
  probability,
  band: "low",
  inputs: { ...DEFAULT_INPUT, restingBP: bp },
});

describe("risk history", () => {
  it("measures change between checks in percentage points", () => {
    expect(pointsChange(0.12, 0.31)).toBe(19);
    expect(pointsChange(0.5, 0.42)).toBe(-8);
  });

  it("labels rises, drops and no change", () => {
    expect(formatPoints(19)).toBe("+19 pts");
    expect(formatPoints(-8)).toBe("−8 pts");
    expect(formatPoints(0)).toBe("no change");
  });

  it("lists checks oldest first with the change from the previous check", () => {
    const digest = buildHistoryDigest([
      check("b", "2026-11-10T09:00:00Z", 0.3, 150),
      check("a", "2026-10-01T09:00:00Z", 0.1, 130),
    ]);
    const lines = digest.split("\n");
    expect(lines[0]).toContain("2026-10-01: risk 10%");
    expect(lines[0]).toContain("resting BP 130 mmHg");
    expect(lines[1]).toContain("2026-11-10: risk 30% [low] (+20 pts vs previous)");
  });
});
