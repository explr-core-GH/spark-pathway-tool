
-- Helper functions
CREATE OR REPLACE FUNCTION public.educator_can_access_camp(_educator_id uuid, _explr_camp_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.explr_camp_educators ece
    WHERE ece.explr_camp_id = _explr_camp_id AND ece.educator_id = _educator_id
  );
$$;

CREATE OR REPLACE FUNCTION public.educator_can_access_student(_educator_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_camp_links scl
    JOIN public.explr_camp_educators ece ON ece.explr_camp_id = scl.explr_camp_id
    WHERE scl.student_id = _student_id AND ece.educator_id = _educator_id
  );
$$;

-- assessment_targets: scoped educator read
DROP POLICY IF EXISTS "assessment_targets educator read" ON public.assessment_targets;
CREATE POLICY "assessment_targets educator read" ON public.assessment_targets
FOR SELECT USING (
  public.is_admin(auth.uid())
  OR (target_type = 'educator' AND target_id = auth.uid())
  OR (target_type = 'camp' AND public.educator_can_access_camp(auth.uid(), target_id))
  OR (target_type = 'student' AND public.educator_can_access_student(auth.uid(), target_id))
);

-- survey_responses: scoped educator read
DROP POLICY IF EXISTS "survey_responses staff read" ON public.survey_responses;
CREATE POLICY "survey_responses staff read" ON public.survey_responses
FOR SELECT USING (
  public.is_admin(auth.uid())
  OR (public.is_educator(auth.uid()) AND public.educator_can_access_student(auth.uid(), student_id))
);

-- survey_item_responses: scoped educator read
DROP POLICY IF EXISTS "survey_item_responses staff read" ON public.survey_item_responses;
CREATE POLICY "survey_item_responses staff read" ON public.survey_item_responses
FOR SELECT USING (
  public.is_admin(auth.uid())
  OR (public.is_educator(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.survey_responses sr
    WHERE sr.id = survey_item_responses.survey_response_id
      AND public.educator_can_access_student(auth.uid(), sr.student_id)
  ))
);

-- survey_open_responses: scoped educator read
DROP POLICY IF EXISTS "survey_open_responses staff read" ON public.survey_open_responses;
CREATE POLICY "survey_open_responses staff read" ON public.survey_open_responses
FOR SELECT USING (
  public.is_admin(auth.uid())
  OR (public.is_educator(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.survey_responses sr
    WHERE sr.id = survey_open_responses.survey_response_id
      AND public.educator_can_access_student(auth.uid(), sr.student_id)
  ))
);

-- camp_educators: scope to self + admin
DROP POLICY IF EXISTS "camp_educators read all educators" ON public.camp_educators;
CREATE POLICY "camp_educators self read" ON public.camp_educators
FOR SELECT USING (public.is_admin(auth.uid()) OR educator_id = auth.uid());

-- explr_camp_educators: scope to self + admin + co-assigned-to-same-camp
DROP POLICY IF EXISTS "explr_camp_educators read all educators" ON public.explr_camp_educators;
CREATE POLICY "explr_camp_educators self read" ON public.explr_camp_educators
FOR SELECT USING (
  public.is_admin(auth.uid())
  OR educator_id = auth.uid()
  OR public.educator_can_access_camp(auth.uid(), explr_camp_id)
);

-- internship_educators: scope to self + admin
DROP POLICY IF EXISTS "internship_educators read all educators" ON public.internship_educators;
CREATE POLICY "internship_educators self read" ON public.internship_educators
FOR SELECT USING (public.is_admin(auth.uid()) OR educator_id = auth.uid());

-- module_progress: add admin read
CREATE POLICY "module_progress admin read" ON public.module_progress
FOR SELECT USING (public.is_admin(auth.uid()));
