import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT } from "./heart-model";
import { buildHistoryDigest, formatPoints, pointsChange, type SavedCheck } from "./risk-history";

const check = (id: string, createdAt: string, probability: number, bp: number): SavedCheck => ({
  id,
  createdAt,
  takenAt: createdAt,
  probability,
  band: "low",
  source: "checker",
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
    expect(lines[0]).toContain("2026-10-01 [risk checker]: risk 10%");
    expect(lines[0]).toContain("resting BP 130 mmHg");
    expect(lines[1]).toContain("2026-11-10 [risk checker]: risk 30% [low] (+20 pts vs previous)");
  });

  it("orders test results by test date and includes only entered lab values and notes", () => {
    const digest = buildHistoryDigest([
      check("a", "2026-11-12T09:00:00Z", 0.2, 130),
      {
        id: "t",
        createdAt: "2026-11-15T09:00:00Z",
        takenAt: "2026-09-01T12:00:00Z",
        probability: 0.4,
        band: "moderate",
        source: "test_results",
        results: { age: 60, sex: "female", ldl: 160, hba1c: 6.4 },
        notes: "Fasting lab at clinic",
        estimated: ["chestPain", "restingBP"],
      },
    ]);
    const lines = digest.split("\n");
    expect(lines[0]).toContain("2026-09-01 [test results]: risk 40% [moderate]");
    expect(lines[0]).toContain("LDL cholesterol 160 mg/dl");
    expect(lines[0]).toContain("HbA1c 6.4 %");
    expect(lines[0]).not.toContain("HDL");
    expect(lines[0]).toContain('note: "Fasting lab at clinic"');
    expect(lines[0]).toContain("Chest pain type, Resting blood pressure");
    expect(lines[1]).toContain("2026-11-12 [risk checker]: risk 20% [low] (−20 pts vs previous)");
  });
});
