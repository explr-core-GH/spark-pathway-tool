
-- Admins can read all applications
CREATE POLICY "applications admin read"
  ON public.internship_applications FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update application status / notes
CREATE POLICY "applications admin update"
  ON public.internship_applications FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can create placements
CREATE POLICY "placements admin insert"
  ON public.internship_placements FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "placements admin update"
  ON public.internship_placements FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "placements admin read"
  ON public.internship_placements FOR SELECT
  USING (public.is_admin(auth.uid()));
