ALTER TABLE public.trishield_watch_sessions
  ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS trishield_watch_sessions_join_code_idx
  ON public.trishield_watch_sessions (join_code);

CREATE OR REPLACE FUNCTION public.generate_trishield_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out TEXT;
  i INT;
BEGIN
  LOOP
    out := '';
    FOR i IN 1..6 LOOP
      out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trishield_watch_sessions WHERE join_code = out);
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_trishield_session_by_code(_code TEXT)
RETURNS TABLE(id UUID, status TEXT, session_type TEXT, exam_id UUID, paper_submission_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.status::text, s.session_type::text, s.exam_id, s.paper_submission_id
  FROM public.trishield_watch_sessions s
  WHERE s.join_code = upper(trim(_code))
    AND s.status = 'active'
  LIMIT 1;
$$;