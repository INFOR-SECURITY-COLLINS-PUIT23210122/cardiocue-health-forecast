import model from "./heart-model.json";

export type Sex = "male" | "female";
export type ChestPain = "typical" | "atypical" | "nonanginal" | "asymptomatic";
export type RestEcg = "normal" | "stt" | "lvh";
export type Slope = "up" | "flat" | "down";
export type Thal = "normal" | "fixed" | "reversible";
export type RiskBand = "low" | "moderate" | "high";

export interface PatientInput {
  age: number;
  sex: Sex;
  chestPain: ChestPain;
  restingBP: number;
  cholesterol: number;
  fastingSugarHigh: boolean;
  restEcg: RestEcg;
  maxHeartRate: number;
  exerciseAngina: boolean;
  stDepression: number;
  slope: Slope;
  vessels: number;
  thal: Thal;
}

export interface Contribution {
  field: string;
  label: string;
  value: number;
}

export interface Prediction {
  probability: number;
  band: RiskBand;
  contributions: Contribution[];
}

export const MODEL_INFO = {
  dataset: model.dataset,
  samples: model.samples,
  positives: model.positives,
  metrics: model.metrics,
};

const FIELD_LABELS: Record<string, string> = {
  age: "Age",
  sex: "Sex",
  chestPain: "Chest pain type",
  restingBP: "Resting blood pressure",
  cholesterol: "Cholesterol",
  fastingSugarHigh: "Fasting blood sugar",
  restEcg: "Resting ECG",
  maxHeartRate: "Max heart rate",
  exerciseAngina: "Exercise-induced angina",
  stDepression: "ST depression",
  slope: "ST slope",
  vessels: "Major vessels (fluoroscopy)",
  thal: "Thalassemia scan",
};

const FEATURE_FIELD: Record<string, keyof PatientInput> = {
  age: "age",
  trestbps: "restingBP",
  chol: "cholesterol",
  thalach: "maxHeartRate",
  oldpeak: "stDepression",
  ca: "vessels",
  sex_male: "sex",
  fbs_high: "fastingSugarHigh",
  exang: "exerciseAngina",
  cp_atypical: "chestPain",
  cp_nonanginal: "chestPain",
  cp_asymptomatic: "chestPain",
  restecg_stt: "restEcg",
  restecg_lvh: "restEcg",
  slope_flat: "slope",
  slope_down: "slope",
  thal_fixed: "thal",
  thal_reversible: "thal",
};

const b = (v: boolean) => (v ? 1 : 0);

export function toFeatures(i: PatientInput): Record<string, number> {
  return {
    age: i.age,
    trestbps: i.restingBP,
    chol: i.cholesterol,
    thalach: i.maxHeartRate,
    oldpeak: i.stDepression,
    ca: i.vessels,
    sex_male: b(i.sex === "male"),
    fbs_high: b(i.fastingSugarHigh),
    exang: b(i.exerciseAngina),
    cp_atypical: b(i.chestPain === "atypical"),
    cp_nonanginal: b(i.chestPain === "nonanginal"),
    cp_asymptomatic: b(i.chestPain === "asymptomatic"),
    restecg_stt: b(i.restEcg === "stt"),
    restecg_lvh: b(i.restEcg === "lvh"),
    slope_flat: b(i.slope === "flat"),
    slope_down: b(i.slope === "down"),
    thal_fixed: b(i.thal === "fixed"),
    thal_reversible: b(i.thal === "reversible"),
  };
}

export function riskBand(probability: number): RiskBand {
  if (probability < 0.3) return "low";
  if (probability < 0.6) return "moderate";
  return "high";
}

export function predict(input: PatientInput): Prediction {
  const x = toFeatures(input);
  const byField: Record<string, number> = {};
  let logit = model.intercept;
  for (const f of model.features) {
    const c = (f.weight * ((x[f.name] ?? 0) - f.mean)) / f.std;
    logit += c;
    const field = FEATURE_FIELD[f.name] ?? f.name;
    byField[field] = (byField[field] ?? 0) + c;
  }
  const probability = 1 / (1 + Math.exp(-logit));
  const contributions = Object.entries(byField)
    .map(([field, value]) => ({ field, label: FIELD_LABELS[field] ?? field, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { probability, band: riskBand(probability), contributions };
}

export const DEFAULT_INPUT: PatientInput = {
  age: 54,
  sex: "male",
  chestPain: "nonanginal",
  restingBP: 130,
  cholesterol: 240,
  fastingSugarHigh: false,
  restEcg: "normal",
  maxHeartRate: 150,
  exerciseAngina: false,
  stDepression: 1,
  slope: "up",
  vessels: 0,
  thal: "normal",
};
