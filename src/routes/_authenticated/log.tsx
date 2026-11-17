import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { ChoiceField, Section } from "@/components/heart/fields";
import { NOT_TESTED, OptionalChoiceField, OptionalNumberField, TestDateField } from "@/components/heart/log-fields";
import { ResultPanel } from "@/components/heart/result-panel";
import { MODEL_FIELDS, predictPartial } from "@/lib/heart-model";
import { saveTestResults } from "@/lib/risk-checks.functions";
import {
  missingModelFields,
  NOTES_MAX,
  NUMBER_FIELDS,
  testResultsEntrySchema,
  testValuesSchema,
  toModelInput,
  type NumberFieldKey,
} from "@/lib/test-results";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "Log test results — Pulse" },
      { name: "description", content: "Enter your real heart test results and lab values with the test date and save them to your history." },
      { property: "og:title", content: "Log test results — Pulse" },
      { property: "og:description", content: "Save real heart test results and lab values to your Pulse history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LogResultsPage,
});

type ChoiceKey = "chestPain" | "exerciseAngina" | "restEcg" | "slope" | "vessels" | "thal";

interface FormState {
  takenAt: Date | undefined;
  age: string;
  sex: "male" | "female";
  nums: Record<NumberFieldKey, string>;
  choices: Record<ChoiceKey, string>;
  notes: string;
}

const EMPTY_NUMS = Object.fromEntries(Object.keys(NUMBER_FIELDS).map((k) => [k, ""])) as Record<NumberFieldKey, string>;
const EMPTY_CHOICES: Record<ChoiceKey, string> = {
  chestPain: NOT_TESTED,
  exerciseAngina: NOT_TESTED,
  restEcg: NOT_TESTED,
  slope: NOT_TESTED,
  vessels: NOT_TESTED,
  thal: NOT_TESTED,
};

const toNumber = (s: string) => (s.trim() === "" ? undefined : Number(s));
const pick = (s: string) => (s === NOT_TESTED ? undefined : s);

/** Turn the form into the shape the server validates; blank fields are left out. */
function toEntry(f: FormState) {
  const nums = Object.fromEntries(
    (Object.keys(f.nums) as NumberFieldKey[]).map((k) => [k, toNumber(f.nums[k])]).filter(([, v]) => v !== undefined),
  );
  const c = f.choices;
  const choices = Object.fromEntries(
    Object.entries({
      chestPain: pick(c.chestPain),
      exerciseAngina: c.exerciseAngina === NOT_TESTED ? undefined : c.exerciseAngina === "yes",
      restEcg: pick(c.restEcg),
      slope: pick(c.slope),
      vessels: c.vessels === NOT_TESTED ? undefined : Number(c.vessels),
      thal: pick(c.thal),
    }).filter(([, v]) => v !== undefined),
  );
  return {
    takenAt: f.takenAt ? format(f.takenAt, "yyyy-MM-dd") : "",
    age: toNumber(f.age),
    sex: f.sex,
    ...nums,
    ...choices,
    ...(f.notes.trim() ? { notes: f.notes } : {}),
  };
}

const VITALS: NumberFieldKey[] = ["systolicBP", "diastolicBP", "restingHeartRate"];
const BLOOD: NumberFieldKey[] = ["totalCholesterol", "ldl", "hdl", "triglycerides", "fastingGlucose", "hba1c"];

function LogResultsPage() {
  const [form, setForm] = useState<FormState>({
    takenAt: new Date(),
    age: "",
    sex: "female",
    nums: EMPTY_NUMS,
    choices: EMPTY_CHOICES,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(saveTestResults);

  const setNum = (k: NumberFieldKey) => (v: string) => setForm((f) => ({ ...f, nums: { ...f.nums, [k]: v } }));
  const setChoice = (k: ChoiceKey) => (v: string) => setForm((f) => ({ ...f, choices: { ...f.choices, [k]: v } }));

  // Live estimate from whichever values are valid so far.
  const preview = useMemo(() => {
    const entry = toEntry(form);
    const valid: Record<string, unknown> = { age: entry.age, sex: entry.sex };
    const shape = testValuesSchema.shape;
    for (const [k, v] of Object.entries(entry)) {
      if (k in shape && shape[k as keyof typeof shape].safeParse(v).success) valid[k] = v;
    }
    const parsed = testValuesSchema.safeParse(valid);
    if (!parsed.success) return null;
    const modelInput = toModelInput(parsed.data);
    return { prediction: predictPartial(modelInput), missing: missingModelFields(modelInput).length };
  }, [form]);

  const saving = useMutation({
    mutationFn: (data: ReturnType<typeof testResultsEntrySchema.parse>) => save({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-checks"] });
      toast.success("Test results saved to your history");
      navigate({ to: "/history" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    const parsed = testResultsEntrySchema.safeParse(toEntry(form));
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "results");
        if (next[key]) continue;
        next[key] = key === "age" ? "Enter an age between 18 and 110." : friendlyError(key, issue.message);
      }
      setErrors(next);
      toast.error("Please check the highlighted fields.");
      return;
    }
    setErrors({});
    saving.mutate(parsed.data);
  };

  const numField = (k: NumberFieldKey) => {
    const f = NUMBER_FIELDS[k];
    return (
      <OptionalNumberField
        key={k}
        id={`field-${k}`}
        label={f.label}
        hint={f.hint}
        unit={f.unit}
        min={f.min}
        max={f.max}
        step={f.step}
        value={form.nums[k]}
        error={errors[k]}
        onChange={setNum(k)}
      />
    );
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 pb-8 pt-12">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Real results · from your doctor or lab</p>
        <h1 className="mt-3 font-serif text-5xl text-foreground">Log test results</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Type in the results from a check-up or lab report. Leave anything you weren't tested for blank — it's
          saved to{" "}
          <Link to="/history" className="text-primary underline-offset-4 hover:underline">
            My history
          </Link>{" "}
          with the test date.
        </p>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section index="01" title="Test details">
            <TestDateField
              value={form.takenAt}
              error={errors["takenAt"]}
              onChange={(d) => setForm((f) => ({ ...f, takenAt: d }))}
            />
            <OptionalNumberField
              id="field-age"
              label="Age on the test date"
              unit="yrs"
              min={18}
              max={110}
              step={1}
              placeholder="Required"
              value={form.age}
              error={errors["age"]}
              onChange={(v) => setForm((f) => ({ ...f, age: v }))}
            />
            <ChoiceField
              label="Sex"
              value={form.sex}
              onChange={(v) => setForm((f) => ({ ...f, sex: v }))}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
            />
          </Section>

          {errors["results"] && (
            <p className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive">{errors["results"]}</p>
          )}

          <Section index="02" title="Blood pressure & heart rate">
            {VITALS.map(numField)}
          </Section>

          <Section index="03" title="Blood work">
            {BLOOD.map(numField)}
          </Section>

          <Section index="04" title="Cardiac tests">
            <OptionalChoiceField
              label="Resting ECG"
              value={form.choices.restEcg}
              onChange={setChoice("restEcg")}
              options={[
                { value: "normal", label: "Normal" },
                { value: "stt", label: "ST-T abnormality" },
                { value: "lvh", label: "LV hypertrophy" },
              ]}
            />
            {numField("maxHeartRate")}
            {numField("stDepression")}
            <OptionalChoiceField
              label="Slope of peak exercise ST segment"
              value={form.choices.slope}
              onChange={setChoice("slope")}
              options={[
                { value: "up", label: "Upsloping" },
                { value: "flat", label: "Flat" },
                { value: "down", label: "Downsloping" },
              ]}
            />
            <OptionalChoiceField
              label="Major vessels coloured by fluoroscopy"
              value={form.choices.vessels}
              onChange={setChoice("vessels")}
              options={["0", "1", "2", "3"].map((v) => ({ value: v, label: v }))}
            />
            <OptionalChoiceField
              label="Thallium stress test"
              value={form.choices.thal}
              onChange={setChoice("thal")}
              options={[
                { value: "normal", label: "Normal" },
                { value: "fixed", label: "Fixed defect" },
                { value: "reversible", label: "Reversible defect" },
              ]}
            />
          </Section>

          <Section index="05" title="Symptoms">
            <OptionalChoiceField
              label="Chest pain type"
              noneLabel="Not sure"
              value={form.choices.chestPain}
              onChange={setChoice("chestPain")}
              options={[
                { value: "typical", label: "Typical angina" },
                { value: "atypical", label: "Atypical angina" },
                { value: "nonanginal", label: "Non-anginal" },
                { value: "asymptomatic", label: "None" },
              ]}
            />
            <OptionalChoiceField
              label="Chest pain during exercise"
              noneLabel="Not sure"
              value={form.choices.exerciseAngina}
              onChange={setChoice("exerciseAngina")}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
            />
          </Section>

          <Section index="06" title="Notes">
            <div className="py-4">
              <label htmlFor="field-notes" className="sr-only">
                Notes
              </label>
              <Textarea
                id="field-notes"
                rows={4}
                maxLength={NOTES_MAX}
                placeholder="Anything worth remembering — the clinic, medication changes, how you felt…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-destructive">{errors["notes"]}</span>
                <span className="text-muted-foreground">
                  {form.notes.length}/{NOTES_MAX}
                </span>
              </div>
            </div>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {preview ? (
            <>
              <ResultPanel prediction={preview.prediction} />
              <p className="rounded-md bg-accent p-3 text-xs leading-relaxed text-accent-foreground">
                Estimate uses {MODEL_FIELDS.length - preview.missing} of {MODEL_FIELDS.length} model measurements.
                {preview.missing > 0 && " The rest use the study average, so the more you enter, the more reliable it is."}
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              Enter the age on the test date to see a risk estimate from these results.
            </div>
          )}
          <Button className="h-11 w-full" disabled={saving.isPending} onClick={handleSave}>
            <Save />
            {saving.isPending ? "Saving…" : "Save to My history"}
          </Button>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            LDL, HDL, triglycerides, HbA1c, diastolic blood pressure and resting heart rate are kept in your history and AI summary but
            don't change the estimate. Educational tool only — not a medical diagnosis.
          </p>
        </aside>
      </main>
    </div>
  );
}

function friendlyError(key: string, message: string): string {
  if (key in NUMBER_FIELDS) {
    const f = NUMBER_FIELDS[key as NumberFieldKey];
    return `Enter a value between ${f.min} and ${f.max} ${f.unit}, or leave it blank.`;
  }
  return message;
}
