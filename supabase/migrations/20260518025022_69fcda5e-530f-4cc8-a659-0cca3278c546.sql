CREATE TABLE IF NOT EXISTS public.internship_career_tags (
  internship_slug text NOT NULL,
  career_sector text NOT NULL,
  tagged_by uuid,
  tagged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (internship_slug, career_sector)
);

ALTER TABLE public.internship_career_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internship_career_tags admin write"
ON public.internship_career_tags FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "internship_career_tags read all educators"
ON public.internship_career_tags FOR SELECT
USING (public.is_educator(auth.uid()));