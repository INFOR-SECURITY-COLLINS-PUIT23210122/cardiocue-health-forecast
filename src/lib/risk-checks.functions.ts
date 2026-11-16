import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { predict, riskBand } from "@/lib/heart-model";
import { patientInputSchema } from "@/lib/patient-input-schema";
import type { HistorySummary, SavedCheck } from "@/lib/risk-history";

const MAX_SUMMARY_CHECKS = 30;

type CheckRow = { id: string; created_at: string; probability: number; inputs: unknown };

function toSavedCheck(row: CheckRow): SavedCheck | null {
  const inputs = patientInputSchema.safeParse(row.inputs);
  if (!inputs.success) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    probability: row.probability,
    band: riskBand(row.probability),
    inputs: inputs.data,
  };
}

export const saveRiskCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patientInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Recompute on the server so saved results always match the model.
    const result = predict(data);
    const { data: row, error } = await context.supabase
      .from("risk_checks")
      .insert({ user_id: context.userId, inputs: data, probability: result.probability, band: result.band })
      .select("id, created_at")
      .single();
    if (error) {
      console.error("[saveRiskCheck]", error.message);
      throw new Error("Could not save this check. Please try again.");
    }
    return { id: row.id, createdAt: row.created_at };
  });

export const listRiskChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedCheck[]> => {
    const { data, error } = await context.supabase
      .from("risk_checks")
      .select("id, created_at, probability, inputs")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      console.error("[listRiskChecks]", error.message);
      throw new Error("Could not load your history.");
    }
    return data.map(toSavedCheck).filter((c): c is SavedCheck => c !== null);
  });

export const deleteRiskCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("risk_checks").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete this check.");
    return { ok: true };
  });

export const summarizeRiskHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ summary: HistorySummary; checkCount: number } | { error: string }> => {
      const { data, error } = await context.supabase
        .from("risk_checks")
        .select("id, created_at, probability, inputs")
        .order("created_at", { ascending: false })
        .limit(MAX_SUMMARY_CHECKS);
      if (error) return { error: "Could not load your history." };
      const checks = data.map(toSavedCheck).filter((c): c is SavedCheck => c !== null);
      if (checks.length === 0) return { error: "Save at least one check to get a summary." };

      const { summarizeHistory } = await import("@/lib/history-summary.server");
      const outcome = await summarizeHistory(checks);
      if (!outcome.ok) return { error: outcome.error };
      return { summary: outcome.summary, checkCount: checks.length };
    },
  );
