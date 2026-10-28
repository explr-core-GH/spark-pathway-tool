CREATE TABLE public.guardians (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.guardians TO authenticated;
GRANT ALL ON public.guardians TO service_role;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guardian self select" ON public.guardians FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "guardian self insert" ON public.guardians FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "guardian self update" ON public.guardians FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin read guardians" ON public.guardians FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.guardian_students (
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('parent','guardian','grandparent','other')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_via_family_link_id uuid REFERENCES public.family_links(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by text CHECK (revoked_by IN ('student','guardian','admin')),
  PRIMARY KEY (guardian_id, student_id)
);
CREATE INDEX guardian_students_student_idx ON public.guardian_students(student_id);
GRANT SELECT ON public.guardian_students TO authenticated;
GRANT UPDATE (revoked_at, revoked_by) ON public.guardian_students TO authenticated;
GRANT ALL ON public.guardian_students TO service_role;
ALTER TABLE public.guardian_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guardian reads own links" ON public.guardian_students FOR SELECT TO authenticated USING (guardian_id = auth.uid());
CREATE POLICY "student reads own links" ON public.guardian_students FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "student revokes own links" ON public.guardian_students FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "admin all guardian links" ON public.guardian_students FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  consent_type text NOT NULL DEFAULT 'participation',
  text_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  ip text
);
CREATE INDEX guardian_consents_pair_idx ON public.guardian_consents(guardian_id, student_id);
GRANT SELECT ON public.guardian_consents TO authenticated;
GRANT ALL ON public.guardian_consents TO service_role;
ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guardian reads own consents" ON public.guardian_consents FOR SELECT TO authenticated USING (guardian_id = auth.uid());
CREATE POLICY "admin all guardian consents" ON public.guardian_consents FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.plan_approvals ADD COLUMN guardian_id uuid REFERENCES public.guardians(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_guardian(uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.guardians WHERE id = uid)
$$;
CREATE OR REPLACE FUNCTION public.guardian_of(_uid uuid, _student_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.guardian_students
    WHERE guardian_id = _uid AND student_id = _student_id AND revoked_at IS NULL)
$$;
REVOKE ALL ON FUNCTION public.is_guardian(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guardian_of(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_guardian(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guardian_of(uuid, uuid) TO anon, authenticated, service_role;

CREATE POLICY "guardian read" ON public.students FOR SELECT TO authenticated USING (public.guardian_of(auth.uid(), id));
CREATE POLICY "guardian read" ON public.assessment_sessions FOR SELECT TO authenticated USING (public.guardian_of(auth.uid(), student_id));
CREATE POLICY "guardian read" ON public.survey_responses FOR SELECT TO authenticated USING (public.guardian_of(auth.uid(), student_id));
CREATE POLICY "guardian read" ON public.checkpoints FOR SELECT TO authenticated USING (public.guardian_of(auth.uid(), student_id));
CREATE POLICY "guardian read" ON public.plan_approvals FOR SELECT TO authenticated USING (public.guardian_of(auth.uid(), student_id));
CREATE POLICY "guardian read" ON public.experiences FOR SELECT TO authenticated USING (public.guardian_of(auth.uid(), student_id));