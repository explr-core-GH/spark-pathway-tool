CREATE POLICY "internship_student_logins self read"
  ON public.internship_student_logins
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());