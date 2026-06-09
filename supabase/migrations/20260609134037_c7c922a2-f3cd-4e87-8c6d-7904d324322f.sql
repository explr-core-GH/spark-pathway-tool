DROP POLICY IF EXISTS "assessment_targets student read" ON public.assessment_targets;

CREATE POLICY "assessment_targets student read"
ON public.assessment_targets
FOR SELECT
TO authenticated
USING (
  -- direct student target
  (target_type = 'student' AND target_id = auth.uid())
  -- camp target the student is linked to
  OR (target_type = 'camp' AND EXISTS (
    SELECT 1 FROM public.student_camp_links scl
    WHERE scl.explr_camp_id = assessment_targets.target_id
      AND scl.student_id = auth.uid()
  ))
  -- educator target whose camps the student is linked to
  OR (target_type = 'educator' AND EXISTS (
    SELECT 1
    FROM public.explr_camp_educators ece
    JOIN public.student_camp_links scl ON scl.explr_camp_id = ece.explr_camp_id
    WHERE ece.educator_id = assessment_targets.target_id
      AND scl.student_id = auth.uid()
  ))
);