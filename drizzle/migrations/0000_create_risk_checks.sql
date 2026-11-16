CREATE TABLE public.risk_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  inputs jsonb NOT NULL,
  probability double precision NOT NULL CHECK (probability >= 0 AND probability <= 1),
  band text NOT NULL CHECK (band IN ('low', 'moderate', 'high')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX risk_checks_user_created_idx ON public.risk_checks (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.risk_checks TO authenticated;
GRANT ALL ON public.risk_checks TO service_role;

ALTER TABLE public.risk_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own risk checks"
  ON public.risk_checks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save their own risk checks"
  ON public.risk_checks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk checks"
  ON public.risk_checks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);