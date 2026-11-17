import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

function Row({ label, hint, error, htmlFor, children }: { label: string; hint?: string | undefined; error?: string | undefined; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
            {label}
          </label>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {children}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function OptionalNumberField({
  id,
  label,
  hint,
  unit,
  min,
  max,
  step,
  value,
  error,
  placeholder = "Not tested",
  onChange,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: string;
  error?: string | undefined;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Row label={label} hint={hint} error={error} htmlFor={id}>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={value}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-28 rounded-md border border-input bg-background px-2 py-1 text-right font-mono text-base text-foreground tabular-nums placeholder:font-sans placeholder:text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            error && "border-destructive",
          )}
        />
        <span className="w-12 text-xs text-muted-foreground">{unit}</span>
      </div>
    </Row>
  );
}

export const NOT_TESTED = "none";

export function OptionalChoiceField({
  label,
  hint,
  value,
  options,
  noneLabel = "Not tested",
  onChange,
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  options: { value: string; label: string }[];
  noneLabel?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3 py-4">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <ToggleGroup
        type="single"
        variant="segment"
        size="sm"
        aria-label={label}
        value={value}
        onValueChange={(v) => onChange(v || NOT_TESTED)}
        className="flex-wrap justify-start"
      >
        <ToggleGroupItem value={NOT_TESTED} className="px-3 text-xs">
          {noneLabel}
        </ToggleGroupItem>
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className="px-3 text-xs">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function TestDateField({ value, error, onChange }: { value: Date | undefined; error?: string | undefined; onChange: (d: Date | undefined) => void }) {
  const today = new Date();
  return (
    <Row label="Test date" hint="When the tests were taken" error={error}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-label="Test date"
            className={cn("w-[200px] justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon />
            {value ? format(value, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            defaultMonth={value ?? today}
            captionLayout="dropdown"
            startMonth={new Date(1950, 0)}
            endMonth={today}
            disabled={{ after: today }}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </Row>
  );
}
