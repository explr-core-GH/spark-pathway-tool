
-- 1. camp_student_logins: scope SELECT to assigned camp educators only
DROP POLICY IF EXISTS "camp_student_logins staff read" ON public.camp_student_logins;
CREATE POLICY "camp_student_logins scoped read" ON public.camp_student_logins
FOR SELECT USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.explr_camp_educators ece
    WHERE ece.explr_camp_id = camp_student_logins.explr_camp_id
      AND ece.educator_id = auth.uid()
  )
);

-- 2. survey_scale_scores view: enforce invoker rights (not definer)
ALTER VIEW public.survey_scale_scores SET (security_invoker = true);

-- 3. assessment_targets: scope student read to their own targets
DROP POLICY IF EXISTS "assessment_targets student read" ON public.assessment_targets;
CREATE POLICY "assessment_targets student read" ON public.assessment_targets
FOR SELECT USING (
  target_type = 'student' AND target_id = auth.uid()
);

-- 4. educators self update: restrict columns via WITH CHECK
DROP POLICY IF EXISTS "educators self update" ON public.educators;
CREATE POLICY "educators self update" ON public.educators
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.educators WHERE id = auth.uid())
  AND approved = (SELECT approved FROM public.educators WHERE id = auth.uid())
);

-- 5. students: scope staff read to camp educators (via student_camp_links + explr_camp_educators)
DROP POLICY IF EXISTS "students staff read" ON public.students;
CREATE POLICY "students staff read" ON public.students
FOR SELECT USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.student_camp_links scl
    JOIN public.explr_camp_educators ece ON ece.explr_camp_id = scl.explr_camp_id
    WHERE scl.student_id = students.id
      AND ece.educator_id = auth.uid()
  )
);

-- 6. survey_assignments: scope read to admins, assigned educators, and assigned students
DROP POLICY IF EXISTS "survey_assignments read" ON public.survey_assignments;
CREATE POLICY "survey_assignments read" ON public.survey_assignments
FOR SELECT USING (
  is_admin(auth.uid())
  OR is_educator(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.assessment_targets at
    WHERE at.survey_assignment_id = survey_assignments.id
      AND at.target_type = 'student'
      AND at.target_id = auth.uid()
  )
);

-- 7. storage: restrict curriculum bucket listing to authenticated users (still public via signed/direct URL by file path; broad listing removed)
DROP POLICY IF EXISTS "curriculum public read" ON storage.objects;
CREATE POLICY "curriculum authenticated read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'curriculum');
