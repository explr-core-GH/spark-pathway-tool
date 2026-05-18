CREATE TABLE public.explr_camp_educators (
  explr_camp_id uuid NOT NULL REFERENCES public.explr_camps(id) ON DELETE CASCADE,
  educator_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (explr_camp_id, educator_id)
);

ALTER TABLE public.explr_camp_educators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "explr_camp_educators admin write"
  ON public.explr_camp_educators FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "explr_camp_educators read all educators"
  ON public.explr_camp_educators FOR SELECT
  USING (is_educator(auth.uid()));