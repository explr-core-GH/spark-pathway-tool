
-- 1. Make is_educator() require approved = true
CREATE OR REPLACE FUNCTION public.is_educator(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.educators WHERE id = uid AND approved = true);
$$;

-- 2. Scope unit_rosters read to assigned educators only
DROP POLICY IF EXISTS "unit_rosters read all educators" ON public.unit_rosters;

CREATE POLICY "unit_rosters scoped educator read"
ON public.unit_rosters
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    is_educator(auth.uid())
    AND (
      (unit_type = 'camp' AND EXISTS (
        SELECT 1 FROM public.camp_educators ce
        WHERE ce.camp_slug = unit_rosters.unit_slug
          AND ce.educator_id = auth.uid()
      ))
      OR (unit_type = 'internship' AND EXISTS (
        SELECT 1 FROM public.internship_educators ie
        WHERE ie.internship_slug = unit_rosters.unit_slug
          AND ie.educator_id = auth.uid()
      ))
    )
  )
);

-- 3. Restrict internship_interest_completions educator read to admins only
DROP POLICY IF EXISTS "interest completions educator read" ON public.internship_interest_completions;

CREATE POLICY "interest completions admin read"
ON public.internship_interest_completions
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 4. Add admin read policy on responses
CREATE POLICY "responses admin read"
ON public.responses
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
