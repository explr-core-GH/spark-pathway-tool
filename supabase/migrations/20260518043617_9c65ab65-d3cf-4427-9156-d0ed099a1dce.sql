CREATE POLICY "sessions educator read"
  ON public.assessment_sessions FOR SELECT
  USING (public.is_educator(auth.uid()));