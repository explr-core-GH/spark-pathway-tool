
-- 1. Backfill missing internship catalog entries so rosters can FK to them.
INSERT INTO public.internships (slug, name, emoji, visible, sort_order) VALUES
  ('techni-team', 'Techni-Team', '🛠️', false, 100),
  ('ace-construction-management', 'ACE Construction Management', '🏗️', false, 100),
  ('nasa', 'NASA (Research @ CSU)', '🚀', false, 100),
  ('webdevai-a', 'WebDevAI (Cohort A)', '💻', false, 100),
  ('webdevai-b', 'WebDevAI (Cohort B)', '💻', false, 100),
  ('bike-cleveland', 'Bike Cleveland', '🚲', false, 100),
  ('advantage-cle', 'Advantage CLE', '🎓', false, 100),
  ('comptia-tri-c', 'CompTIA @ Tri-C', '💾', false, 100),
  ('developmental-disability-intern', 'Developmental Disability Intern', '🤝', false, 100),
  ('nasa-glenn', 'NASA Glenn', '🛰️', false, 100),
  ('nestlejumpstart-colab', 'NestleJumpstart Colab', '🍫', false, 100),
  ('ohio-guidestone', 'Ohio Guidestone', '💚', false, 100),
  ('signature-health', 'Signature Health', '🏥', false, 100),
  ('uh-future-nurses', 'UH Future Nurses', '👩‍⚕️', false, 100)
ON CONFLICT (slug) DO NOTHING;

-- 2. Roster table — pre-login list of students per internship.
CREATE TABLE public.internship_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_slug text NOT NULL REFERENCES public.internships(slug) ON DELETE CASCADE,
  student_name text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid,
  UNIQUE (internship_slug, student_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_rosters TO authenticated;
GRANT ALL ON public.internship_rosters TO service_role;
ALTER TABLE public.internship_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internship_rosters admin write" ON public.internship_rosters
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "internship_rosters educator read" ON public.internship_rosters
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.internship_educators ie
      WHERE ie.internship_slug = internship_rosters.internship_slug
        AND ie.educator_id = auth.uid()
    )
  );

CREATE INDEX idx_internship_rosters_slug ON public.internship_rosters(internship_slug);

-- 3. Logins table — generated auth credentials per rostered student.
CREATE TABLE public.internship_student_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_slug text NOT NULL REFERENCES public.internships(slug) ON DELETE CASCADE,
  roster_id uuid REFERENCES public.internship_rosters(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  child_name text NOT NULL,
  username text NOT NULL,
  password_plain text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  UNIQUE (roster_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_student_logins TO authenticated;
GRANT ALL ON public.internship_student_logins TO service_role;
ALTER TABLE public.internship_student_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internship_student_logins admin read" ON public.internship_student_logins
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "internship_student_logins admin write" ON public.internship_student_logins
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_internship_student_logins_slug ON public.internship_student_logins(internship_slug);
