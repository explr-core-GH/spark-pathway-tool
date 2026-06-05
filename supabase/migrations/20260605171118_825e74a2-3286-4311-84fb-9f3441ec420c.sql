ALTER TABLE public.educator_invites
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'educator'
    CHECK (role IN ('educator', 'admin'));

CREATE INDEX IF NOT EXISTS idx_educator_invites_role
  ON public.educator_invites(role);

DROP POLICY IF EXISTS "curriculum public read" ON storage.objects;
CREATE POLICY "curriculum public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'curriculum');

DROP POLICY IF EXISTS "curriculum admin write" ON storage.objects;
CREATE POLICY "curriculum admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'curriculum' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "curriculum admin update" ON storage.objects;
CREATE POLICY "curriculum admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'curriculum' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'curriculum' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "curriculum admin delete" ON storage.objects;
CREATE POLICY "curriculum admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'curriculum' AND public.is_admin(auth.uid()));

DO $$
DECLARE
  v_user_id uuid;
  v_full_name text;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = 'j.seigler@csuohio.edu'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth.users row for j.seigler@csuohio.edu yet — the trigger below will catch them on sign-up.';
    RETURN;
  END IF;

  SELECT full_name INTO v_full_name
  FROM public.educators
  WHERE id = v_user_id;

  INSERT INTO public.admins (id, full_name, email)
  VALUES (v_user_id, COALESCE(v_full_name, 'Jordan Seigler'), 'j.seigler@csuohio.edu')
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.educators WHERE id = v_user_id;
END $$;

CREATE OR REPLACE FUNCTION public.auto_promote_seed_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(COALESCE(NEW.email, ''));
  v_seed_admins text[] := ARRAY['j.seigler@csuohio.edu'];
BEGIN
  IF v_email = '' THEN
    RETURN NEW;
  END IF;

  IF NOT (v_email = ANY (v_seed_admins)) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admins (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'full_name'),
      initcap(split_part(v_email, '@', 1))
    ),
    v_email
  )
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.educators WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_promote_seed_admins ON auth.users;
CREATE TRIGGER trg_auto_promote_seed_admins
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_promote_seed_admins();

CREATE TABLE IF NOT EXISTS public.survey_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_type text NOT NULL CHECK (survey_type IN ('retrospective', 'middle_school', 'high_school')),
  administration text NOT NULL CHECK (administration IN ('pre', 'post', 'retrospective')),
  unit_type text NOT NULL CHECK (unit_type IN ('camp', 'internship')),
  unit_ref text NOT NULL,
  title text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  opens_at timestamptz,
  closes_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_assignments TO authenticated;
GRANT ALL ON public.survey_assignments TO service_role;
ALTER TABLE public.survey_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_assignments admin write" ON public.survey_assignments;
CREATE POLICY "survey_assignments admin write" ON public.survey_assignments
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "survey_assignments read" ON public.survey_assignments;
CREATE POLICY "survey_assignments read" ON public.survey_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.survey_assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  survey_type text NOT NULL,
  administration text NOT NULL,
  demographics jsonb,
  device_type text,
  progress_index integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (assignment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_responses TO authenticated;
GRANT ALL ON public.survey_responses TO service_role;
CREATE INDEX IF NOT EXISTS idx_survey_responses_assignment ON public.survey_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_student ON public.survey_responses(student_id);
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_responses self" ON public.survey_responses;
CREATE POLICY "survey_responses self" ON public.survey_responses
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "survey_responses staff read" ON public.survey_responses;
CREATE POLICY "survey_responses staff read" ON public.survey_responses
  FOR SELECT USING (public.is_educator(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.survey_item_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_response_id uuid NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  value_now integer,
  value_then integer,
  skipped boolean NOT NULL DEFAULT false,
  UNIQUE (survey_response_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_item_responses TO authenticated;
GRANT ALL ON public.survey_item_responses TO service_role;
CREATE INDEX IF NOT EXISTS idx_survey_item_responses_parent ON public.survey_item_responses(survey_response_id);
ALTER TABLE public.survey_item_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_item_responses self" ON public.survey_item_responses;
CREATE POLICY "survey_item_responses self" ON public.survey_item_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_response_id AND sr.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_response_id AND sr.student_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "survey_item_responses staff read" ON public.survey_item_responses;
CREATE POLICY "survey_item_responses staff read" ON public.survey_item_responses
  FOR SELECT USING (public.is_educator(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.survey_open_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_response_id uuid NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  response text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_open_responses TO authenticated;
GRANT ALL ON public.survey_open_responses TO service_role;
CREATE INDEX IF NOT EXISTS idx_survey_open_responses_parent ON public.survey_open_responses(survey_response_id);
ALTER TABLE public.survey_open_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_open_responses self" ON public.survey_open_responses;
CREATE POLICY "survey_open_responses self" ON public.survey_open_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_response_id AND sr.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = survey_response_id AND sr.student_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "survey_open_responses staff read" ON public.survey_open_responses;
CREATE POLICY "survey_open_responses staff read" ON public.survey_open_responses
  FOR SELECT USING (public.is_educator(auth.uid()) OR public.is_admin(auth.uid()));

CREATE OR REPLACE VIEW public.survey_scale_scores AS
SELECT
  sr.id AS survey_response_id,
  sr.assignment_id,
  sr.student_id,
  sr.survey_type,
  sr.administration,
  sr.completed_at,
  avg(CASE WHEN ir.item_id LIKE 'math_%' AND NOT ir.skipped
    THEN (CASE WHEN ir.item_id IN ('math_1','math_3','math_5')
               THEN 6 - ir.value_now ELSE ir.value_now END)
  END) AS math_now_mean,
  avg(CASE WHEN ir.item_id LIKE 'science_%' AND NOT ir.skipped
    THEN (CASE WHEN ir.item_id = 'science_8'
               THEN 6 - ir.value_now ELSE ir.value_now END)
  END) AS science_now_mean,
  avg(CASE WHEN ir.item_id LIKE 'engtech_%' AND NOT ir.skipped
    THEN ir.value_now END) AS engtech_now_mean,
  avg(CASE WHEN ir.item_id LIKE 'c21_%' AND NOT ir.skipped
    THEN ir.value_now END) AS c21_now_mean,
  avg(CASE WHEN ir.item_id LIKE 'career_%' AND NOT ir.skipped
       AND ir.item_id NOT LIKE 'career_planning_%'
    THEN ir.value_now END) AS career_interest_now_mean,
  avg(CASE WHEN ir.item_id LIKE 'career_planning_%' AND NOT ir.skipped
    THEN ir.value_now END) AS career_planning_now_mean,
  avg(CASE WHEN ir.item_id LIKE 'wbl_%' AND NOT ir.skipped
    THEN ir.value_now END) AS wbl_now_mean,
  avg(CASE WHEN ir.item_id LIKE 'math_%' AND NOT ir.skipped
       AND ir.value_then IS NOT NULL
    THEN (CASE WHEN ir.item_id IN ('math_1','math_3','math_5')
               THEN 6 - ir.value_then ELSE ir.value_then END)
  END) AS math_then_mean,
  avg(CASE WHEN ir.item_id LIKE 'science_%' AND NOT ir.skipped
       AND ir.value_then IS NOT NULL
    THEN (CASE WHEN ir.item_id = 'science_8'
               THEN 6 - ir.value_then ELSE ir.value_then END)
  END) AS science_then_mean,
  avg(CASE WHEN ir.item_id LIKE 'engtech_%' AND NOT ir.skipped
       AND ir.value_then IS NOT NULL THEN ir.value_then END) AS engtech_then_mean,
  avg(CASE WHEN ir.item_id LIKE 'c21_%' AND NOT ir.skipped
       AND ir.value_then IS NOT NULL THEN ir.value_then END) AS c21_then_mean,
  avg(CASE WHEN ir.item_id LIKE 'career_%' AND NOT ir.skipped
       AND ir.item_id NOT LIKE 'career_planning_%'
       AND ir.value_then IS NOT NULL THEN ir.value_then END) AS career_interest_then_mean
FROM public.survey_responses sr
LEFT JOIN public.survey_item_responses ir ON ir.survey_response_id = sr.id
GROUP BY sr.id;

CREATE TABLE IF NOT EXISTS public.assessment_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_kind text NOT NULL CHECK (assessment_kind IN (
    'riasec',
    'internship_interest',
    'aptitude_ms',
    'aptitude_hs',
    'survey'
  )),
  survey_assignment_id uuid REFERENCES public.survey_assignments(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('educator', 'student')),
  target_id uuid NOT NULL,
  assigned_by uuid,
  due_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_targets TO authenticated;
GRANT ALL ON public.assessment_targets TO service_role;
CREATE INDEX IF NOT EXISTS idx_assessment_targets_target ON public.assessment_targets(target_type, target_id);
ALTER TABLE public.assessment_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessment_targets admin write" ON public.assessment_targets;
CREATE POLICY "assessment_targets admin write" ON public.assessment_targets
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "assessment_targets educator read" ON public.assessment_targets;
CREATE POLICY "assessment_targets educator read" ON public.assessment_targets
  FOR SELECT USING (public.is_educator(auth.uid()));
DROP POLICY IF EXISTS "assessment_targets student read" ON public.assessment_targets;
CREATE POLICY "assessment_targets student read" ON public.assessment_targets
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "students staff read" ON public.students;
CREATE POLICY "students staff read" ON public.students
  FOR SELECT USING (public.is_educator(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.student_camp_links (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  explr_camp_id uuid NOT NULL REFERENCES public.explr_camps(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, explr_camp_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_camp_links TO authenticated;
GRANT ALL ON public.student_camp_links TO service_role;
CREATE INDEX IF NOT EXISTS idx_student_camp_links_camp ON public.student_camp_links(explr_camp_id);
CREATE INDEX IF NOT EXISTS idx_student_camp_links_student ON public.student_camp_links(student_id);
ALTER TABLE public.student_camp_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_camp_links staff read" ON public.student_camp_links;
CREATE POLICY "student_camp_links staff read" ON public.student_camp_links
  FOR SELECT USING (public.is_educator(auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "student_camp_links self read" ON public.student_camp_links;
CREATE POLICY "student_camp_links self read" ON public.student_camp_links
  FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "student_camp_links admin write" ON public.student_camp_links;
CREATE POLICY "student_camp_links admin write" ON public.student_camp_links
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.camp_student_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  explr_camp_id uuid REFERENCES public.explr_camps(id) ON DELETE CASCADE,
  explr_registration_id uuid UNIQUE REFERENCES public.explr_registrations(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  child_name text NOT NULL,
  username text NOT NULL,
  password_plain text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_student_logins TO authenticated;
GRANT ALL ON public.camp_student_logins TO service_role;
CREATE INDEX IF NOT EXISTS idx_camp_student_logins_camp ON public.camp_student_logins(explr_camp_id);
ALTER TABLE public.camp_student_logins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "camp_student_logins staff read" ON public.camp_student_logins;
CREATE POLICY "camp_student_logins staff read" ON public.camp_student_logins
  FOR SELECT USING (public.is_educator(auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "camp_student_logins admin write" ON public.camp_student_logins;
CREATE POLICY "camp_student_logins admin write" ON public.camp_student_logins
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';