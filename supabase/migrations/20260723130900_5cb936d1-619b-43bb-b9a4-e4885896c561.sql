
-- 1) Add target_slug column so internship-scoped assessment targets can persist.
ALTER TABLE public.assessment_targets ADD COLUMN IF NOT EXISTS target_slug text;
CREATE INDEX IF NOT EXISTS assessment_targets_target_slug_idx
  ON public.assessment_targets(target_type, target_slug);

-- 2) Allow interns to read internship-scoped survey assignments.
--    Match by internship_placements OR internship_student_logins (excel-imported interns
--    don't have placement rows).
DROP POLICY IF EXISTS "survey_assignments read" ON public.survey_assignments;
CREATE POLICY "survey_assignments read" ON public.survey_assignments
FOR SELECT USING (
  is_admin(auth.uid())
  OR is_educator(auth.uid())
  OR EXISTS (
    SELECT 1 FROM assessment_targets at
    WHERE at.survey_assignment_id = survey_assignments.id
      AND at.target_type = 'student'
      AND at.target_id = auth.uid()
  )
  OR (
    unit_type = 'camp' AND EXISTS (
      SELECT 1 FROM assessment_targets at
      JOIN student_camp_links scl ON scl.explr_camp_id = at.target_id
      WHERE at.survey_assignment_id = survey_assignments.id
        AND at.target_type = 'camp'
        AND scl.student_id = auth.uid()
    )
  )
  OR (
    unit_type = 'internship' AND (
      EXISTS (
        SELECT 1 FROM internship_placements ip
        WHERE ip.student_id = auth.uid()
          AND ip.approved_internship_id = survey_assignments.unit_ref
      )
      OR EXISTS (
        SELECT 1 FROM internship_student_logins isl
        WHERE isl.student_id = auth.uid()
          AND isl.internship_slug = survey_assignments.unit_ref
      )
    )
  )
);

-- 3) Same idea for assessment_targets read: interns need to see targets that
--    point at their internship (via target_slug), and camp students need the
--    existing paths. Keep it permissive-for-self so useStudentAssignments works.
DROP POLICY IF EXISTS "assessment_targets read" ON public.assessment_targets;
CREATE POLICY "assessment_targets read" ON public.assessment_targets
FOR SELECT USING (
  is_admin(auth.uid())
  OR is_educator(auth.uid())
  OR (target_type = 'student' AND target_id = auth.uid())
  OR (target_type = 'camp' AND EXISTS (
        SELECT 1 FROM student_camp_links scl
        WHERE scl.explr_camp_id = assessment_targets.target_id
          AND scl.student_id = auth.uid()))
  OR (target_type = 'class' AND EXISTS (
        SELECT 1 FROM class_students cs
        WHERE cs.class_id = assessment_targets.target_id
          AND cs.student_id = auth.uid()))
  OR (target_type = 'internship' AND (
        EXISTS (SELECT 1 FROM internship_placements ip
                WHERE ip.student_id = auth.uid()
                  AND ip.approved_internship_id = assessment_targets.target_slug)
        OR EXISTS (SELECT 1 FROM internship_student_logins isl
                   WHERE isl.student_id = auth.uid()
                     AND isl.internship_slug = assessment_targets.target_slug)
      ))
);
