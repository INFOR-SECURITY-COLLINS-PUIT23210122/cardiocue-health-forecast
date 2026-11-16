import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface FieldShellProps {
  label: string;
  hint?: string | undefined;
  aside?: ReactNode | undefined;
  children: ReactNode;
}

function FieldShell({ label, hint, aside, children }: FieldShellProps) {
  return (
    <div className="space-y-3 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  hint?: string | undefined;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}

export function NumberField({ label, hint, unit, min, max, step = 1, value, onChange }: NumberFieldProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      aside={
        <div className="shrink-0 font-mono text-lg text-foreground tabular-nums">
          {step < 1 ? value.toFixed(1) : value}
          {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
        </div>
      }
    >
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => v !== undefined && onChange(v)}
      />
    </FieldShell>
  );
}

interface ChoiceFieldProps<T extends string> {
  label: string;
  hint?: string | undefined;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function ChoiceField<T extends string>({ label, hint, value, options, onChange }: ChoiceFieldProps<T>) {
  return (
    <FieldShell label={label} hint={hint}>
      <ToggleGroup
        type="single"
        variant="segment"
        size="sm"
        aria-label={label}
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
        className="flex-wrap"
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className="px-3 text-xs">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldShell>
  );
}

interface BoolFieldProps {
  label: string;
  hint?: string | undefined;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function BoolField({ label, hint, value, onChange }: BoolFieldProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      aside={<Switch aria-label={label} checked={value} onCheckedChange={onChange} />}
    >
      {null}
    </FieldShell>
  );
}

export function Section({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card px-6 py-5">
      <div className="mb-1 flex items-center gap-3 border-b border-border pb-3">
        <span className="font-mono text-xs text-primary">{index}</span>
        <h2 className="font-serif text-xl text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}
