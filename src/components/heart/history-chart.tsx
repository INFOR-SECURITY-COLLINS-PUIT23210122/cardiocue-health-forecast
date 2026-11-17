import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEntryDate, SOURCE_LABEL, type SavedCheck } from "@/lib/risk-history";

export function HistoryChart({ checks }: { checks: SavedCheck[] }) {
  const data = checks.map((c) => ({
    date: formatEntryDate(c, "short"),
    risk: Math.round(c.probability * 100),
    source: SOURCE_LABEL[c.source],
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, _name, item) => [`${v}%`, `Risk · ${(item.payload as { source: string }).source}`]}
          />
          <Area type="monotone" dataKey="risk" stroke="var(--primary)" strokeWidth={2} fill="url(#riskFill)" dot={{ r: 3, fill: "var(--primary)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
