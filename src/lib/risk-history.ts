import type { PatientInput, RiskBand } from "./heart-model";

export interface SavedCheck {
  id: string;
  createdAt: string;
  probability: number;
  band: RiskBand;
  inputs: PatientInput;
}

export interface HistoryChange {
  measurement: string;
  detail: string;
  direction: "better" | "worse" | "steady";
}

export interface HistorySummary {
  headline: string;
  overview: string;
  changes: HistoryChange[];
  nextStep: string;
}

/** Change in risk between two checks, in whole percentage points (positive = risk went up). */
export function pointsChange(from: number, to: number): number {
  return Math.round(to * 100) - Math.round(from * 100);
}

const LABELS = {
  chestPain: { typical: "typical angina", atypical: "atypical angina", nonanginal: "non-anginal pain", asymptomatic: "no chest pain" },
  restEcg: { normal: "normal", stt: "ST-T abnormality", lvh: "left ventricular hypertrophy" },
  slope: { up: "upsloping", flat: "flat", down: "downsloping" },
  thal: { normal: "normal", fixed: "fixed defect", reversible: "reversible defect" },
} as const;

export function describeInputs(i: PatientInput): string {
  return [
    `age ${i.age}`,
    i.sex,
    `chest pain: ${LABELS.chestPain[i.chestPain]}`,
    `resting BP ${i.restingBP} mmHg`,
    `cholesterol ${i.cholesterol} mg/dl`,
    `fasting sugar >120: ${i.fastingSugarHigh ? "yes" : "no"}`,
    `resting ECG: ${LABELS.restEcg[i.restEcg]}`,
    `max heart rate ${i.maxHeartRate} bpm`,
    `exercise angina: ${i.exerciseAngina ? "yes" : "no"}`,
    `ST depression ${i.stDepression.toFixed(1)} mm`,
    `ST slope: ${LABELS.slope[i.slope]}`,
    `vessels on fluoroscopy: ${i.vessels}`,
    `thallium: ${LABELS.thal[i.thal]}`,
  ].join("; ");
}

/** Compact, oldest-first text record of saved checks for the AI summary. */
export function buildHistoryDigest(checks: SavedCheck[]): string {
  const sorted = [...checks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return sorted
    .map((c, idx) => {
      const date = c.createdAt.slice(0, 10);
      const prev = sorted[idx - 1];
      const delta = prev ? ` (${formatPoints(pointsChange(prev.probability, c.probability))} vs previous)` : "";
      return `#${idx + 1} ${date}: risk ${Math.round(c.probability * 100)}% [${c.band}]${delta} — ${describeInputs(c.inputs)}`;
    })
    .join("\n");
}

export function formatPoints(points: number): string {
  if (points === 0) return "no change";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} pts`;
}
