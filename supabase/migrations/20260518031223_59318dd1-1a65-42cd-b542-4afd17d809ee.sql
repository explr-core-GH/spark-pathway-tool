-- Visibility toggle per internship
CREATE TABLE public.internship_visibility (
  internship_slug text PRIMARY KEY,
  visible boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internship_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visibility readable to authed"
  ON public.internship_visibility
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "visibility admin write"
  ON public.internship_visibility
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Interest survey responses (yes/maybe/no per internship)
CREATE TABLE public.internship_interest_responses (
  student_id uuid NOT NULL,
  internship_slug text NOT NULL,
  response text NOT NULL CHECK (response IN ('yes','maybe','no')),
  responded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, internship_slug)
);

ALTER TABLE public.internship_interest_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interest responses self all"
  ON public.internship_interest_responses
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "interest responses educator read"
  ON public.internship_interest_responses
  FOR SELECT
  USING (is_educator(auth.uid()));

-- Completion record (a student has finished the survey at least once)
CREATE TABLE public.internship_interest_completions (
  student_id uuid PRIMARY KEY,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internship_interest_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interest completions self all"
  ON public.internship_interest_completions
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "interest completions educator read"
  ON public.internship_interest_completions
  FOR SELECT
  USING (is_educator(auth.uid()));