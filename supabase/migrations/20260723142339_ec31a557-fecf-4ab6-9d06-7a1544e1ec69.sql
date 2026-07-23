GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_educators TO authenticated;
GRANT ALL ON public.internship_educators TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_student_logins TO authenticated;
GRANT ALL ON public.internship_student_logins TO service_role;

NOTIFY pgrst, 'reload schema';