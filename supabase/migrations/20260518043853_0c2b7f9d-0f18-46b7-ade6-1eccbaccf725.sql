
CREATE TABLE public.camp_educators (
  camp_slug text NOT NULL,
  educator_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  PRIMARY KEY (camp_slug, educator_id)
);
ALTER TABLE public.camp_educators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camp_educators admin write" ON public.camp_educators
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "camp_educators read all educators" ON public.camp_educators
  FOR SELECT USING (is_educator(auth.uid()));

CREATE TABLE public.internship_educators (
  internship_slug text NOT NULL,
  educator_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  PRIMARY KEY (internship_slug, educator_id)
);
ALTER TABLE public.internship_educators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internship_educators admin write" ON public.internship_educators
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "internship_educators read all educators" ON public.internship_educators
  FOR SELECT USING (is_educator(auth.uid()));
