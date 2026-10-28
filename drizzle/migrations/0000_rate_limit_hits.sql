CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
GRANT ALL ON public.rate_limit_hits TO service_role;
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _max int, _window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start timestamptz;
  _hits int;
BEGIN
  _start := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.rate_limit_hits AS r (key, window_start, hits)
  VALUES (_key, _start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING hits INTO _hits;
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';
  END IF;
  RETURN _hits <= _max;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO service_role;