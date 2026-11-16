import { describe, expect, it } from "vitest";
import { predict, riskBand, type PatientInput } from "./heart-model";

// Two real patients from the Cleveland dataset: one healthy, one with heart disease.
const healthy: PatientInput = {
  age: 63, sex: "male", chestPain: "typical", restingBP: 145, cholesterol: 233,
  fastingSugarHigh: true, restEcg: "lvh", maxHeartRate: 150, exerciseAngina: false,
  stDepression: 2.3, slope: "down", vessels: 0, thal: "fixed",
};
const diseased: PatientInput = {
  age: 67, sex: "male", chestPain: "asymptomatic", restingBP: 160, cholesterol: 286,
  fastingSugarHigh: false, restEcg: "lvh", maxHeartRate: 108, exerciseAngina: true,
  stDepression: 1.5, slope: "flat", vessels: 3, thal: "normal",
};

describe("heart disease model", () => {
  it("matches the trained model's output for a healthy patient", () => {
    expect(predict(healthy).probability).toBeCloseTo(0.1227, 3);
    expect(predict(healthy).band).toBe("low");
  });

  it("flags a patient with heart disease as high risk", () => {
    expect(predict(diseased).probability).toBeGreaterThan(0.99);
    expect(predict(diseased).band).toBe("high");
  });

  it("uses 30% and 60% as the risk band cut-offs", () => {
    expect(riskBand(0.29)).toBe("low");
    expect(riskBand(0.3)).toBe("moderate");
    expect(riskBand(0.59)).toBe("moderate");
    expect(riskBand(0.6)).toBe("high");
  });
});
