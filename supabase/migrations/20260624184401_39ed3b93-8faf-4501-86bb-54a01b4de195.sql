
DROP POLICY IF EXISTS "camp_student_logins scoped read" ON public.camp_student_logins;
CREATE POLICY "camp_student_logins admin read"
  ON public.camp_student_logins FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "class_students staff read" ON public.class_students;
CREATE POLICY "class_students scoped read"
  ON public.class_students FOR SELECT
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND c.educator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classes staff read" ON public.classes;
CREATE POLICY "classes scoped read"
  ON public.classes FOR SELECT
  USING (
    is_admin(auth.uid())
    OR educator_id = auth.uid()
  );

DROP POLICY IF EXISTS "organizations staff read" ON public.organizations;
CREATE POLICY "organizations admin read"
  ON public.organizations FOR SELECT
  USING (is_admin(auth.uid()));

REVOKE SELECT ON public.explr_registrations FROM anon, authenticated;
GRANT SELECT (
  id, camp_id, child_name, child_age, status,
  imported_at, source_created_at
) ON public.explr_registrations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.explr_registrations TO authenticated;

DROP POLICY IF EXISTS "form-uploads read" ON storage.objects;
CREATE POLICY "form-uploads authenticated read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'form-uploads'
    AND auth.uid() IS NOT NULL
  );
