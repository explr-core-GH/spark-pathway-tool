
DROP POLICY IF EXISTS "isr educator read" ON public.internship_survey_results;
CREATE POLICY "isr educator read" ON public.internship_survey_results
  FOR SELECT TO authenticated
  USING (public.educator_can_access_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "student_camp_links staff read" ON public.student_camp_links;
CREATE POLICY "student_camp_links staff read" ON public.student_camp_links
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.explr_camp_educators ece
      WHERE ece.explr_camp_id = student_camp_links.explr_camp_id
        AND ece.educator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student_presence staff read" ON public.student_presence;
CREATE POLICY "student_presence staff read" ON public.student_presence
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR public.educator_can_access_student(auth.uid(), student_id)
  );
