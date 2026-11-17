import type { PatientInput, RiskBand } from "./heart-model";
import { fieldLabel } from "./heart-model";
import { NUMBER_FIELDS, type NumberFieldKey, type TestValues } from "./test-results";

interface BaseEntry {
  id: string;
  createdAt: string;
  /** When the measurements were taken: save time for risk checks, the test date for test results. */
  takenAt: string;
  probability: number;
  band: RiskBand;
}

export interface CheckerEntry extends BaseEntry {
  source: "checker";
  inputs: PatientInput;
}

export interface TestResultsEntry extends BaseEntry {
  source: "test_results";
  results: TestValues;
  notes: string | null;
  /** Model measurements that weren't entered and use the study average. */
  estimated: (keyof PatientInput)[];
}

export type SavedCheck = CheckerEntry | TestResultsEntry;

export const SOURCE_LABEL = { checker: "Risk checker", test_results: "Test results" } as const;

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

export const CHOICE_LABELS = {
  chestPain: { typical: "typical angina", atypical: "atypical angina", nonanginal: "non-anginal pain", asymptomatic: "no chest pain" },
  restEcg: { normal: "normal", stt: "ST-T abnormality", lvh: "left ventricular hypertrophy" },
  slope: { up: "upsloping", flat: "flat", down: "downsloping" },
  thal: { normal: "normal", fixed: "fixed defect", reversible: "reversible defect" },
} as const;

export function describeInputs(i: PatientInput): string {
  return [
    `age ${i.age}`,
    i.sex,
    `chest pain: ${CHOICE_LABELS.chestPain[i.chestPain]}`,
    `resting BP ${i.restingBP} mmHg`,
    `cholesterol ${i.cholesterol} mg/dl`,
    `fasting sugar >120: ${i.fastingSugarHigh ? "yes" : "no"}`,
    `resting ECG: ${CHOICE_LABELS.restEcg[i.restEcg]}`,
    `max heart rate ${i.maxHeartRate} bpm`,
    `exercise angina: ${i.exerciseAngina ? "yes" : "no"}`,
    `ST depression ${i.stDepression.toFixed(1)} mm`,
    `ST slope: ${CHOICE_LABELS.slope[i.slope]}`,
    `vessels on fluoroscopy: ${i.vessels}`,
    `thallium: ${CHOICE_LABELS.thal[i.thal]}`,
  ].join("; ");
}

export function formatTestNumber(key: NumberFieldKey, value: number): string {
  const f = NUMBER_FIELDS[key];
  return `${f.step < 1 ? value.toFixed(1) : value} ${f.unit}`;
}

/** Only the values the person actually entered, as label/value pairs. */
export function enteredTestValues(v: TestValues): { key: string; label: string; short: string; value: string }[] {
  const out: { key: string; label: string; short: string; value: string }[] = [];
  for (const key of Object.keys(NUMBER_FIELDS) as NumberFieldKey[]) {
    const n = v[key];
    if (n !== undefined) out.push({ key, label: NUMBER_FIELDS[key].label, short: NUMBER_FIELDS[key].short, value: formatTestNumber(key, n) });
  }
  if (v.restEcg) out.push({ key: "restEcg", label: "Resting ECG", short: "ECG", value: CHOICE_LABELS.restEcg[v.restEcg] });
  if (v.slope) out.push({ key: "slope", label: "ST slope", short: "Slope", value: CHOICE_LABELS.slope[v.slope] });
  if (v.vessels !== undefined) out.push({ key: "vessels", label: "Vessels on fluoroscopy", short: "Vessels", value: String(v.vessels) });
  if (v.thal) out.push({ key: "thal", label: "Thallium scan", short: "Thal", value: CHOICE_LABELS.thal[v.thal] });
  if (v.chestPain) out.push({ key: "chestPain", label: "Chest pain", short: "Chest pain", value: CHOICE_LABELS.chestPain[v.chestPain] });
  if (v.exerciseAngina !== undefined)
    out.push({ key: "exerciseAngina", label: "Exercise angina", short: "Ex. angina", value: v.exerciseAngina ? "yes" : "no" });
  return out;
}

export function describeTestResults(e: TestResultsEntry): string {
  const parts = [`age ${e.results.age}`, e.results.sex, ...enteredTestValues(e.results).map((x) => `${x.label} ${x.value}`)];
  if (e.estimated.length > 0) parts.push(`not tested (model used study average): ${e.estimated.map(fieldLabel).join(", ")}`);
  if (e.notes) parts.push(`note: "${e.notes.replace(/\s+/g, " ")}"`);
  return parts.join("; ");
}

export function sortByTakenAt(checks: SavedCheck[]): SavedCheck[] {
  return [...checks].sort(
    (a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt) || Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

/** Compact, oldest-first text record of saved checks for the AI summary. */
export function buildHistoryDigest(checks: SavedCheck[]): string {
  const sorted = sortByTakenAt(checks);
  return sorted
    .map((c, idx) => {
      const date = c.takenAt.slice(0, 10);
      const prev = sorted[idx - 1];
      const delta = prev ? ` (${formatPoints(pointsChange(prev.probability, c.probability))} vs previous)` : "";
      const detail = c.source === "checker" ? describeInputs(c.inputs) : describeTestResults(c);
      return `#${idx + 1} ${date} [${SOURCE_LABEL[c.source].toLowerCase()}]: risk ${Math.round(c.probability * 100)}% [${c.band}]${delta} — ${detail}`;
    })
    .join("\n");
}

export function formatPoints(points: number): string {
  if (points === 0) return "no change";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} pts`;
}

/** Display date: test results show just the test day; risk checks also show the time saved. */
export function formatEntryDate(c: SavedCheck, style: "short" | "long" = "long"): string {
  const d = new Date(c.takenAt);
  if (style === "short") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(c.source === "test_results" ? { timeZone: "UTC" } : {}) });
  }
  if (c.source === "test_results") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
