DROP POLICY IF EXISTS "survey_assignments read" ON public.survey_assignments;

CREATE POLICY "survey_assignments read" ON public.survey_assignments
FOR SELECT
USING (
  is_admin(auth.uid())
  OR is_educator(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.assessment_targets at
    WHERE at.survey_assignment_id = survey_assignments.id
      AND at.target_type = 'student'
      AND at.target_id = auth.uid()
  )
  OR (
    survey_assignments.unit_type = 'camp'
    AND EXISTS (
      SELECT 1
      FROM public.assessment_targets at
      JOIN public.student_camp_links scl
        ON scl.explr_camp_id = at.target_id
      WHERE at.survey_assignment_id = survey_assignments.id
        AND at.target_type = 'camp'
        AND scl.student_id = auth.uid()
    )
  )
);