import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoolField, ChoiceField, NumberField, Section } from "@/components/heart/fields";
import { ResultPanel } from "@/components/heart/result-panel";
import { DEFAULT_INPUT, MODEL_INFO, predict, type PatientInput } from "@/lib/heart-model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — Heart Disease Risk Model" },
      {
        name: "description",
        content:
          "Enter clinical measurements and get an instant heart disease probability from a model trained on the Cleveland dataset.",
      },
      { property: "og:title", content: "Pulse — Heart Disease Risk Model" },
      {
        property: "og:description",
        content: "Instant heart disease probability from a model trained on real clinical data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Index() {
  const [input, setInput] = useState<PatientInput>(DEFAULT_INPUT);
  const prediction = useMemo(() => predict(input), [input]);
  const set = <K extends keyof PatientInput>(k: K) => (v: PatientInput[K]) =>
    setInput((s) => ({ ...s, [k]: v }));
  const m = MODEL_INFO.metrics;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Heart className="heartbeat size-5 fill-primary text-primary" />
            <span className="font-serif text-xl text-foreground">Pulse</span>
          </div>
          <div className="hidden gap-6 font-mono text-xs text-muted-foreground sm:flex">
            <span>
              accuracy <span className="text-foreground">{pct(m.accuracy)}</span>
            </span>
            <span>
              AUC <span className="text-foreground">{m.auc.toFixed(2)}</span>
            </span>
            <span>
              n=<span className="text-foreground">{MODEL_INFO.samples}</span>
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-14">
        <div className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              Logistic regression · 13 clinical markers
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] text-foreground md:text-6xl">
              How likely is
              <br />
              heart disease?
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground">
              Adjust the measurements below. The model, trained on {MODEL_INFO.samples} patients
              from the Cleveland Clinic study, updates its estimate instantly.
            </p>
          </div>
          <svg viewBox="0 0 400 100" className="h-24 w-full" aria-hidden>
            <path
              d="M0 50 H110 L125 50 L135 30 L145 50 L160 50 L170 10 L182 92 L194 50 L215 50 L228 38 L242 50 H400"
              fill="none"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="ecg-line stroke-primary"
            />
          </svg>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section index="01" title="About the patient">
            <NumberField label="Age" unit="yrs" min={25} max={85} value={input.age} onChange={set("age")} />
            <ChoiceField
              label="Sex"
              value={input.sex}
              onChange={set("sex")}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
            />
          </Section>

          <Section index="02" title="Symptoms">
            <ChoiceField
              label="Chest pain type"
              value={input.chestPain}
              onChange={set("chestPain")}
              options={[
                { value: "typical", label: "Typical angina" },
                { value: "atypical", label: "Atypical angina" },
                { value: "nonanginal", label: "Non-anginal" },
                { value: "asymptomatic", label: "None" },
              ]}
            />
            <BoolField
              label="Exercise-induced angina"
              hint="Chest pain brought on by physical effort"
              value={input.exerciseAngina}
              onChange={set("exerciseAngina")}
            />
          </Section>

          <Section index="03" title="Vitals & blood work">
            <NumberField
              label="Resting blood pressure"
              hint="Systolic, on admission"
              unit="mmHg"
              min={90}
              max={200}
              value={input.restingBP}
              onChange={set("restingBP")}
            />
            <NumberField
              label="Serum cholesterol"
              unit="mg/dl"
              min={120}
              max={570}
              value={input.cholesterol}
              onChange={set("cholesterol")}
            />
            <BoolField
              label="Fasting blood sugar above 120 mg/dl"
              value={input.fastingSugarHigh}
              onChange={set("fastingSugarHigh")}
            />
          </Section>

          <Section index="04" title="Cardiac tests">
            <ChoiceField
              label="Resting ECG"
              value={input.restEcg}
              onChange={set("restEcg")}
              options={[
                { value: "normal", label: "Normal" },
                { value: "stt", label: "ST-T abnormality" },
                { value: "lvh", label: "LV hypertrophy" },
              ]}
            />
            <NumberField
              label="Maximum heart rate achieved"
              hint="During exercise stress test"
              unit="bpm"
              min={70}
              max={205}
              value={input.maxHeartRate}
              onChange={set("maxHeartRate")}
            />
            <NumberField
              label="ST depression"
              hint="Induced by exercise, relative to rest"
              unit="mm"
              min={0}
              max={6.2}
              step={0.1}
              value={input.stDepression}
              onChange={set("stDepression")}
            />
            <ChoiceField
              label="Slope of peak exercise ST segment"
              value={input.slope}
              onChange={set("slope")}
              options={[
                { value: "up", label: "Upsloping" },
                { value: "flat", label: "Flat" },
                { value: "down", label: "Downsloping" },
              ]}
            />
            <ChoiceField
              label="Major vessels coloured by fluoroscopy"
              value={String(input.vessels) as "0" | "1" | "2" | "3"}
              onChange={(v) => set("vessels")(Number(v))}
              options={[
                { value: "0", label: "0" },
                { value: "1", label: "1" },
                { value: "2", label: "7" },
                { value: "3", label: "3" },
              ]}
            />
            <ChoiceField
              label="Thallium stress test"
              value={input.thal}
              onChange={set("thal")}
              options={[
                { value: "normal", label: "Normal" },
                { value: "fixed", label: "Fixed defect" },
                { value: "reversible", label: "Reversible defect" },
              ]}
            />
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ResultPanel prediction={prediction} />
          <Button variant="outline" className="w-full" onClick={() => setInput(DEFAULT_INPUT)}>
            <RotateCcw /> Reset to sample patient
          </Button>
          <div className="rounded-lg border border-border bg-card p-5 text-xs text-muted-foreground">
            <div className="mb-3 font-mono uppercase tracking-widest text-foreground">Model card</div>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt>Accuracy</dt>
              <dd className="text-right font-mono text-foreground">{pct(m.accuracy)}</dd>
              <dt>ROC AUC</dt>
              <dd className="text-right font-mono text-foreground">{m.auc.toFixed(3)}</dd>
              <dt>Sensitivity</dt>
              <dd className="text-right font-mono text-foreground">{pct(m.sensitivity)}</dd>
              <dt>Specificity</dt>
              <dd className="text-right font-mono text-foreground">{pct(m.specificity)}</dd>
              <dt>Validation</dt>
              <dd className="text-right font-mono text-foreground">{m.folds}-fold CV</dd>
            </dl>
            <p className="mt-4 border-t border-border pt-3 leading-relaxed">
              Educational tool only — not a medical diagnosis. Trained on the UCI Cleveland dataset
              (1988). Talk to a doctor about any heart health concerns.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
