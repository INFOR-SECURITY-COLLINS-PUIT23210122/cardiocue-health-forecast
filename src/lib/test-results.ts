import { z } from "zod";
import { MODEL_FIELDS, type PatientInput } from "./heart-model";

// Client-safe schema and helpers for real heart test results that a person logs themselves.

export const NUMBER_FIELDS = {
  systolicBP: { label: "Systolic blood pressure", short: "BP", unit: "mmHg", min: 60, max: 260, step: 1, hint: "The top number" },
  diastolicBP: { label: "Diastolic blood pressure", short: "Dia", unit: "mmHg", min: 30, max: 160, step: 1, hint: "The bottom number" },
  restingHeartRate: { label: "Resting heart rate", short: "Rest HR", unit: "bpm", min: 30, max: 200, step: 1, hint: "Pulse while sitting still" },
  totalCholesterol: { label: "Total cholesterol", short: "Chol", unit: "mg/dl", min: 80, max: 700, step: 1, hint: undefined },
  ldl: { label: "LDL cholesterol", short: "LDL", unit: "mg/dl", min: 20, max: 400, step: 1, hint: "\"Bad\" cholesterol" },
  hdl: { label: "HDL cholesterol", short: "HDL", unit: "mg/dl", min: 10, max: 150, step: 1, hint: "\"Good\" cholesterol" },
  triglycerides: { label: "Triglycerides", short: "TG", unit: "mg/dl", min: 20, max: 2000, step: 1, hint: undefined },
  fastingGlucose: { label: "Fasting blood glucose", short: "Glucose", unit: "mg/dl", min: 40, max: 500, step: 1, hint: "Blood sugar after not eating" },
  hba1c: { label: "HbA1c", short: "HbA1c", unit: "%", min: 3, max: 20, step: 0.1, hint: "Average blood sugar over 3 months" },
  maxHeartRate: { label: "Maximum heart rate", short: "Max HR", unit: "bpm", min: 50, max: 230, step: 1, hint: "Highest rate in an exercise stress test" },
  stDepression: { label: "ST depression", short: "ST", unit: "mm", min: 0, max: 10, step: 0.1, hint: "From an exercise ECG" },
} as const;

export type NumberFieldKey = keyof typeof NUMBER_FIELDS;

const optNum = (k: NumberFieldKey) => z.number().min(NUMBER_FIELDS[k].min).max(NUMBER_FIELDS[k].max).optional();

export const testValuesSchema = z.object({
  age: z.number().int().min(18).max(110),
  sex: z.enum(["male", "female"]),
  systolicBP: optNum("systolicBP"),
  diastolicBP: optNum("diastolicBP"),
  restingHeartRate: optNum("restingHeartRate"),
  totalCholesterol: optNum("totalCholesterol"),
  ldl: optNum("ldl"),
  hdl: optNum("hdl"),
  triglycerides: optNum("triglycerides"),
  fastingGlucose: optNum("fastingGlucose"),
  hba1c: optNum("hba1c"),
  maxHeartRate: optNum("maxHeartRate"),
  stDepression: optNum("stDepression"),
  chestPain: z.enum(["typical", "atypical", "nonanginal", "asymptomatic"]).optional(),
  exerciseAngina: z.boolean().optional(),
  restEcg: z.enum(["normal", "stt", "lvh"]).optional(),
  slope: z.enum(["up", "flat", "down"]).optional(),
  vessels: z.number().int().min(0).max(3).optional(),
  thal: z.enum(["normal", "fixed", "reversible"]).optional(),
});

export type TestValues = z.infer<typeof testValuesSchema>;

export const NOTES_MAX = 1000;
const EARLIEST_TEST_DATE = "1950-01-01";

/** A test date is valid when it's a real calendar day, not before 1950, and not in the future. */
export function isAllowedTestDate(date: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return false;
  // Allow one day ahead of UTC so people east of UTC can log "today".
  const latest = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return date >= EARLIEST_TEST_DATE && date <= latest;
}

const TEST_VALUE_KEYS = (Object.keys(testValuesSchema.shape) as (keyof TestValues)[]).filter(
  (k) => k !== "age" && k !== "sex",
);

export function hasAnyTestValue(v: Partial<TestValues>): boolean {
  return TEST_VALUE_KEYS.some((k) => v[k] !== undefined);
}

export const testResultsEntrySchema = testValuesSchema
  .extend({
    takenAt: z.string().refine((d) => isAllowedTestDate(d), "Pick the date of the test (not in the future)."),
    notes: z.string().trim().max(NOTES_MAX, `Notes can be up to ${NOTES_MAX} characters.`).optional(),
  })
  .refine(hasAnyTestValue, { message: "Enter at least one test result.", path: ["results"] });

export type TestResultsEntry = z.infer<typeof testResultsEntrySchema>;

/** Split a submitted entry into the stored test values, date and notes. */
export function splitEntry(entry: TestResultsEntry): { values: TestValues; takenAt: string; notes: string | null } {
  const { takenAt, notes, ...values } = entry;
  return { values: testValuesSchema.parse(values), takenAt, notes: notes ? notes : null };
}

/** Map real test results onto the model's measurements. Unknown measurements stay out. */
export function toModelInput(v: TestValues): Partial<PatientInput> {
  const m: Partial<PatientInput> = { age: v.age, sex: v.sex };
  if (v.systolicBP !== undefined) m.restingBP = v.systolicBP;
  if (v.totalCholesterol !== undefined) m.cholesterol = v.totalCholesterol;
  if (v.fastingGlucose !== undefined) m.fastingSugarHigh = v.fastingGlucose > 120;
  if (v.maxHeartRate !== undefined) m.maxHeartRate = v.maxHeartRate;
  if (v.stDepression !== undefined) m.stDepression = v.stDepression;
  if (v.chestPain !== undefined) m.chestPain = v.chestPain;
  if (v.exerciseAngina !== undefined) m.exerciseAngina = v.exerciseAngina;
  if (v.restEcg !== undefined) m.restEcg = v.restEcg;
  if (v.slope !== undefined) m.slope = v.slope;
  if (v.vessels !== undefined) m.vessels = v.vessels;
  if (v.thal !== undefined) m.thal = v.thal;
  return m;
}

/** Model measurements the person didn't provide (estimated from the study average). */
export function missingModelFields(input: Partial<PatientInput>): (keyof PatientInput)[] {
  return MODEL_FIELDS.filter((f) => input[f] === undefined);
}

/** Store the test date at midday UTC so it shows as the same calendar day everywhere. */
export function testDateToTimestamp(date: string): string {
  return `${date}T12:00:00Z`;
}
