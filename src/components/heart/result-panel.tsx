import { cn } from "@/lib/utils";
import type { Prediction, RiskBand } from "@/lib/heart-model";

const BAND: Record<RiskBand, { label: string; text: string; stroke: string; bg: string; note: string }> = {
  low: {
    label: "Low risk",
    text: "text-risk-low",
    stroke: "stroke-risk-low",
    bg: "bg-risk-low",
    note: "The profile looks similar to patients without heart disease in the study.",
  },
  moderate: {
    label: "Moderate risk",
    text: "text-risk-moderate",
    stroke: "stroke-risk-moderate",
    bg: "bg-risk-moderate",
    note: "Some indicators overlap with patients who had heart disease.",
  },
  high: {
    label: "High risk",
    text: "text-risk-high",
    stroke: "stroke-risk-high",
    bg: "bg-risk-high",
    note: "This profile closely matches patients diagnosed with heart disease.",
  },
};

function Gauge({ value, band }: { value: number; band: RiskBand }) {
  const r = 80;
  const length = Math.PI * r;
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[260px]" aria-hidden>
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        className="stroke-secondary"
      />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - value)}
        className={cn("transition-all duration-500 ease-out", BAND[band].stroke)}
      />
    </svg>
  );
}

export function ResultPanel({ prediction }: { prediction: Prediction }) {
  const { probability, band, contributions } = prediction;
  const pct = Math.round(probability * 100);
  const top = contributions.slice(0, 6);
  const maxAbs = Math.max(...top.map((c) => Math.abs(c.value)), 0.01);
  const b = BAND[band];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Estimated probability
      </div>
      <div className="relative mt-4 flex flex-col items-center">
        <Gauge value={probability} band={band} />
        <div className="absolute bottom-0 flex flex-col items-center">
          <div className="font-serif text-6xl leading-none text-foreground tabular-nums" aria-live="polite">
            {pct}
            <span className="text-2xl text-muted-foreground">%</span>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        <span className={cn("size-2 rounded-full", b.bg)} />
        <span className={cn("text-sm font-semibold", b.text)}>{b.label}</span>
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">{b.note}</p>

      <div className="mt-8 border-t border-border pt-5">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            What drives this result
          </div>
          <div className="text-[10px] text-muted-foreground">vs. average patient</div>
        </div>
        <ul className="space-y-3">
          {top.map((c) => {
            const w = (Math.abs(c.value) / maxAbs) * 50;
            const up = c.value > 0;
            return (
              <li key={c.field}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-foreground">{c.label}</span>
                  <span className={cn("font-mono", up ? "text-risk-high" : "text-risk-low")}>
                    {up ? "▲ raises" : "▼ lowers"}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-secondary">
                  <div className="absolute left-1/2 top-[-3px] h-3 w-px bg-border" />
                  <div
                    className={cn(
                      "absolute top-0 h-full rounded-full transition-all duration-500",
                      up ? "bg-risk-high" : "bg-risk-low",
                    )}
                    style={up ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
