
-- 1. educator_invites: remove public read
DROP POLICY IF EXISTS "invites read by anyone" ON public.educator_invites;
CREATE POLICY "invites admin read" ON public.educator_invites
  FOR SELECT USING (is_admin(auth.uid()));

-- 2. explr_registrations: scope educator read to assigned camps
DROP POLICY IF EXISTS "explr_registrations educator read" ON public.explr_registrations;
CREATE POLICY "explr_registrations scoped read" ON public.explr_registrations
  FOR SELECT USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.explr_camp_educators ece
      WHERE ece.explr_camp_id = explr_registrations.camp_id
        AND ece.educator_id = auth.uid()
    )
  );

-- 3. assessment_sessions / aptitude_results / internship_interest_responses: admin-only educator read
DROP POLICY IF EXISTS "sessions educator read" ON public.assessment_sessions;
CREATE POLICY "sessions admin read" ON public.assessment_sessions
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "aptitude educator read" ON public.aptitude_results;
CREATE POLICY "aptitude admin read" ON public.aptitude_results
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "interest responses educator read" ON public.internship_interest_responses;
CREATE POLICY "interest responses admin read" ON public.internship_interest_responses
  FOR SELECT USING (is_admin(auth.uid()));

-- 4. educators self update: prevent role/approval escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_educator_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT is_admin(auth.uid()) THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Educators cannot change their own role';
    END IF;
    IF NEW.approved IS DISTINCT FROM OLD.approved THEN
      RAISE EXCEPTION 'Educators cannot change their own approval status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_educator_self_escalation_trg ON public.educators;
CREATE TRIGGER prevent_educator_self_escalation_trg
  BEFORE UPDATE ON public.educators
  FOR EACH ROW EXECUTE FUNCTION public.prevent_educator_self_escalation();

-- 5. unit_rosters: admin-only writes
DROP POLICY IF EXISTS "unit_rosters write any educator" ON public.unit_rosters;
CREATE POLICY "unit_rosters admin write" ON public.unit_rosters
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 6. Revoke EXECUTE on advance_session from anon
REVOKE EXECUTE ON FUNCTION public.advance_session(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.advance_session(uuid) TO authenticated;

-- 7. Storage: remove broad public listing on curriculum bucket
DROP POLICY IF EXISTS "curriculum public read" ON storage.objects;
