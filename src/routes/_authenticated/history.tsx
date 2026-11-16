import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { HistoryChart } from "@/components/heart/history-chart";
import { deleteRiskCheck, listRiskChecks, summarizeRiskHistory } from "@/lib/risk-checks.functions";
import { formatPoints, pointsChange, type HistoryChange, type SavedCheck } from "@/lib/risk-history";
import { cn } from "@/lib/utils";

const historyQuery = queryOptions({ queryKey: ["risk-checks"], queryFn: () => listRiskChecks() });

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "My risk history — Pulse" },
      { name: "description", content: "Your saved heart risk checks with an AI summary of changes over time." },
      { property: "og:title", content: "My risk history — Pulse" },
      { property: "og:description", content: "Saved heart risk checks with an AI summary of changes over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(historyQuery),
  component: HistoryPage,
});

const BAND_TEXT = { low: "text-risk-low", moderate: "text-risk-moderate", high: "text-risk-high" } as const;
const BAND_BG = { low: "bg-risk-low", moderate: "bg-risk-moderate", high: "bg-risk-high" } as const;

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function HistoryPage() {
  const { data: checks } = useSuspenseQuery(historyQuery);
  const queryClient = useQueryClient();
  const summarize = useServerFn(summarizeRiskHistory);
  const remove = useServerFn(deleteRiskCheck);

  const summary = useMutation({ mutationFn: () => summarize() });
  const deletion = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-checks"] });
      toast.success("Check deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const first = checks[0];
  const latest = checks[checks.length - 1];
  const overall = first && latest && checks.length > 1 ? pointsChange(first.probability, latest.probability) : null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Saved checks · {checks.length}</p>
        <h1 className="mt-3 font-serif text-5xl text-foreground">Your risk history</h1>

        {checks.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <p className="font-serif text-2xl text-foreground">No saved checks yet</p>
            <p className="mt-2 text-muted-foreground">Enter your measurements and save a check to start tracking.</p>
            <Button asChild className="mt-6">
              <Link to="/">Take a risk check</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_400px]">
            <div className="space-y-6">
              <section className="rounded-lg border border-border bg-card p-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Estimated risk over time</div>
                    {latest && (
                      <div className="mt-2 flex items-baseline gap-3">
                        <span className="font-serif text-4xl text-foreground">{Math.round(latest.probability * 100)}%</span>
                        <span className="text-sm text-muted-foreground">latest</span>
                      </div>
                    )}
                  </div>
                  {overall !== null && (
                    <div className="text-right">
                      <div className={cn("font-mono text-lg", overall > 0 ? "text-risk-high" : overall < 0 ? "text-risk-low" : "text-muted-foreground")}>
                        {formatPoints(overall)}
                      </div>
                      <div className="text-xs text-muted-foreground">since first check</div>
                    </div>
                  )}
                </div>
                <HistoryChart checks={checks} />
              </section>

              <section className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-6 py-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  All checks
                </div>
                <ul className="divide-y divide-border">
                  {[...checks].reverse().map((c, i, arr) => (
                    <CheckRow
                      key={c.id}
                      check={c}
                      previous={arr[i + 1]}
                      deleting={deletion.isPending && deletion.variables === c.id}
                      onDelete={() => deletion.mutate(c.id)}
                    />
                  ))}
                </ul>
              </section>
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="size-4 text-primary" /> AI summary
                </div>

                {summary.data && "summary" in summary.data ? (
                  <SummaryView summary={summary.data.summary} checkCount={summary.data.checkCount} />
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Get a plain-language summary of your saved checks and the changes that matter most.
                  </p>
                )}

                {summary.data && "error" in summary.data && (
                  <p className="mt-4 rounded-md bg-accent p-3 text-sm text-accent-foreground">{summary.data.error}</p>
                )}
                {summary.isError && (
                  <p className="mt-4 rounded-md bg-accent p-3 text-sm text-accent-foreground">Couldn't reach the AI. Please try again.</p>
                )}

                <Button className="mt-6 w-full" disabled={summary.isPending} onClick={() => summary.mutate()}>
                  <Sparkles />
                  {summary.isPending ? "Reading your history…" : summary.data ? "Refresh summary" : "Summarize my history"}
                </Button>
                {checks.length === 1 && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">Save more checks to see changes over time.</p>
                )}
              </section>
              <p className="mt-4 px-1 text-xs leading-relaxed text-muted-foreground">
                AI summaries can make mistakes and are not medical advice. Talk to a doctor about your results.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function CheckRow({
  check,
  previous,
  deleting,
  onDelete,
}: {
  check: SavedCheck;
  previous: SavedCheck | undefined;
  deleting: boolean;
  onDelete: () => void;
}) {
  const delta = previous ? pointsChange(previous.probability, check.probability) : null;
  const i = check.inputs;
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
      <div className="w-16 font-serif text-2xl text-foreground tabular-nums">{Math.round(check.probability * 100)}%</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("size-2 rounded-full", BAND_BG[check.band])} />
          <span className={cn("font-medium capitalize", BAND_TEXT[check.band])}>{check.band}</span>
          <span className="text-muted-foreground">· {fmtDateTime(check.createdAt)}</span>
        </div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">
          BP {i.restingBP} · Chol {i.cholesterol} · Max HR {i.maxHeartRate} · ST {i.stDepression.toFixed(1)}
        </div>
      </div>
      {delta !== null && (
        <div className={cn("font-mono text-xs", delta > 0 ? "text-risk-high" : delta < 0 ? "text-risk-low" : "text-muted-foreground")}>
          {formatPoints(delta)}
        </div>
      )}
      <Button variant="ghost" size="icon" aria-label="Delete check" disabled={deleting} onClick={onDelete}>
        <Trash2 />
      </Button>
    </li>
  );
}

const DIRECTION = {
  better: { icon: ArrowDownRight, text: "text-risk-low", label: "Better" },
  worse: { icon: ArrowUpRight, text: "text-risk-high", label: "Worse" },
  steady: { icon: Minus, text: "text-muted-foreground", label: "Steady" },
} as const;

function SummaryView({ summary, checkCount }: { summary: { headline: string; overview: string; changes: HistoryChange[]; nextStep: string }; checkCount: number }) {
  return (
    <div className="mt-4">
      <h2 className="font-serif text-2xl leading-tight text-foreground">{summary.headline}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{summary.overview}</p>
      {summary.changes.length > 0 && (
        <ul className="mt-5 space-y-3">
          {summary.changes.map((c, idx) => {
            const d = DIRECTION[c.direction];
            const Icon = d.icon;
            return (
              <li key={idx} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{c.measurement}</span>
                  <span className={cn("flex items-center gap-1 font-mono text-xs", d.text)}>
                    <Icon className="size-3.5" /> {d.label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-5 border-l-2 border-primary pl-3 text-sm text-foreground">{summary.nextStep}</p>
      <p className="mt-3 text-[11px] text-muted-foreground">Based on your latest {checkCount} check{checkCount === 1 ? "" : "s"}.</p>
    </div>
  );
}
