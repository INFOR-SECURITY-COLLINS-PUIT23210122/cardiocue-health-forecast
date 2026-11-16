ALTER TABLE public.risk_checks
  ADD COLUMN source text NOT NULL DEFAULT 'checker' CHECK (source IN ('checker', 'test_results')),
  ADD COLUMN taken_at timestamptz,
  ADD COLUMN lab_results jsonb,
  ADD COLUMN notes text CHECK (notes IS NULL OR char_length(notes) <= 1000);

UPDATE public.risk_checks SET taken_at = created_at WHERE taken_at IS NULL;

ALTER TABLE public.risk_checks
  ALTER COLUMN taken_at SET DEFAULT now(),
  ALTER COLUMN taken_at SET NOT NULL;

CREATE INDEX risk_checks_user_taken_idx ON public.risk_checks (user_id, taken_at DESC);