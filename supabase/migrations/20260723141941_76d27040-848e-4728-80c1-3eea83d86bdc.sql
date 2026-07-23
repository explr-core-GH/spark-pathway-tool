CREATE POLICY "internship_student_logins supervisor read"
ON public.internship_student_logins FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.internship_educators ie
  WHERE ie.educator_id = auth.uid()
    AND ie.internship_slug = internship_student_logins.internship_slug
));