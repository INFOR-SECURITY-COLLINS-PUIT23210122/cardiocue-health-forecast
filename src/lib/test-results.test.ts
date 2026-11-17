import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT, predict, predictPartial } from "./heart-model";
import {
  isAllowedTestDate,
  missingModelFields,
  testDateToTimestamp,
  testResultsEntrySchema,
  toModelInput,
} from "./test-results";

const NOW = new Date("2026-11-17T00:11:00Z");

describe("logging real test results", () => {
  it("rejects test dates in the future and before 1950", () => {
    expect(isAllowedTestDate("2026-11-17", NOW)).toBe(true);
    expect(isAllowedTestDate("2026-11-18", NOW)).toBe(true); // one day of timezone slack
    expect(isAllowedTestDate("2026-11-20", NOW)).toBe(false);
    expect(isAllowedTestDate("1949-12-31", NOW)).toBe(false);
    expect(isAllowedTestDate("2026-02-30", NOW)).toBe(false);
  });

  it("needs a test date, age, sex and at least one test result", () => {
    const base = { takenAt: "2026-01-10", age: 55, sex: "male" };
    expect(testResultsEntrySchema.safeParse(base).success).toBe(false);
    expect(testResultsEntrySchema.safeParse({ ...base, ldl: 130 }).success).toBe(true);
    expect(testResultsEntrySchema.safeParse({ ...base, takenAt: "", ldl: 130 }).success).toBe(false);
  });

  it("limits notes to 1000 characters", () => {
    const base = { takenAt: "2026-01-10", age: 55, sex: "male", ldl: 130 };
    expect(testResultsEntrySchema.safeParse({ ...base, notes: "a".repeat(1000) }).success).toBe(true);
    expect(testResultsEntrySchema.safeParse({ ...base, notes: "a".repeat(1001) }).success).toBe(false);
  });

  it("treats fasting glucose above 120 mg/dl as high fasting sugar", () => {
    expect(toModelInput({ age: 50, sex: "male", fastingGlucose: 121 }).fastingSugarHigh).toBe(true);
    expect(toModelInput({ age: 50, sex: "male", fastingGlucose: 120 }).fastingSugarHigh).toBe(false);
  });

  it("uses systolic blood pressure and total cholesterol as the model's values", () => {
    const m = toModelInput({ age: 50, sex: "female", systolicBP: 142, totalCholesterol: 260, ldl: 150 });
    expect(m.restingBP).toBe(142);
    expect(m.cholesterol).toBe(260);
    expect(missingModelFields(m)).toHaveLength(13 - 4);
  });

  it("gives the same estimate as the full model when every measurement is known", () => {
    expect(predictPartial(DEFAULT_INPUT).probability).toBeCloseTo(predict(DEFAULT_INPUT).probability, 10);
  });

  it("lets untested measurements neither raise nor lower the estimate", () => {
    const partial = predictPartial({ age: 54, sex: "male", vessels: 3 });
    expect(partial.contributions.map((c) => c.field).sort()).toEqual(["age", "sex", "vessels"]);
    expect(partial.probability).toBeGreaterThan(predictPartial({ age: 54, sex: "male" }).probability);
  });

  it("stores the test date at midday UTC so it shows as the same day everywhere", () => {
    expect(testDateToTimestamp("2026-03-04")).toBe("2026-03-04T12:00:00Z");
  });
});
