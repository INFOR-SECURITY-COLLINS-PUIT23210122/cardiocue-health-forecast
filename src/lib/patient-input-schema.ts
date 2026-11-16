import { z } from "zod";

// Client-safe validation for a set of heart measurements (shared by the form, server and history).
export const patientInputSchema = z.object({
  age: z.number().min(18).max(110),
  sex: z.enum(["male", "female"]),
  chestPain: z.enum(["typical", "atypical", "nonanginal", "asymptomatic"]),
  restingBP: z.number().min(60).max(260),
  cholesterol: z.number().min(80).max(700),
  fastingSugarHigh: z.boolean(),
  restEcg: z.enum(["normal", "stt", "lvh"]),
  maxHeartRate: z.number().min(50).max(230),
  exerciseAngina: z.boolean(),
  stDepression: z.number().min(0).max(10),
  slope: z.enum(["up", "flat", "down"]),
  vessels: z.number().int().min(0).max(3),
  thal: z.enum(["normal", "fixed", "reversible"]),
});

export type PatientInputData = z.infer<typeof patientInputSchema>;
