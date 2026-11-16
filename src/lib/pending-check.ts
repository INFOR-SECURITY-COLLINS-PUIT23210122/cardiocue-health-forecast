import { patientInputSchema, type PatientInputData } from "./patient-input-schema";

// Keeps the measurements someone entered while they go sign in, so they can save them after.
const KEY = "pulse:pending-check";

export function stashPendingCheck(input: PatientInputData) {
  sessionStorage.setItem(KEY, JSON.stringify(input));
}

export function takePendingCheck(): PatientInputData | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    const parsed = patientInputSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
