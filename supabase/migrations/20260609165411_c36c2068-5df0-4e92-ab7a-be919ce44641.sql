
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;

GRANT SELECT ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;

-- Questions
DROP POLICY IF EXISTS "Candidates read questions for own live exams" ON public.questions;
CREATE POLICY "Candidates read questions for own live exams"
ON public.questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.registrations r
    JOIN public.exams e ON e.id = r.exam_id
    WHERE r.exam_id = questions.exam_id
      AND r.candidate_id = auth.uid()
      AND r.paid = true
      AND r.status <> 'rejected'
      AND e.status = 'live'
  )
  OR public.current_user_has_any_role('admin','superadmin','invigilator')
);

-- Answers
DROP POLICY IF EXISTS "Candidates manage own answers" ON public.answers;
CREATE POLICY "Candidates select own answers"
ON public.answers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions s
    JOIN public.registrations r ON r.id = s.registration_id
    WHERE s.id = answers.session_id
      AND (r.candidate_id = auth.uid()
           OR public.current_user_has_any_role('admin','superadmin','invigilator'))
  )
);
CREATE POLICY "Candidates write own answers before submit"
ON public.answers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_sessions s
    JOIN public.registrations r ON r.id = s.registration_id
    WHERE s.id = answers.session_id
      AND r.candidate_id = auth.uid()
      AND COALESCE(s.is_submitted, false) = false
  )
);
CREATE POLICY "Candidates update own answers before submit"
ON public.answers FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions s
    JOIN public.registrations r ON r.id = s.registration_id
    WHERE s.id = answers.session_id
      AND r.candidate_id = auth.uid()
      AND COALESCE(s.is_submitted, false) = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_sessions s
    JOIN public.registrations r ON r.id = s.registration_id
    WHERE s.id = answers.session_id
      AND r.candidate_id = auth.uid()
      AND COALESCE(s.is_submitted, false) = false
  )
);

-- Registrations
DROP POLICY IF EXISTS "Candidates manage own registrations" ON public.registrations;

CREATE POLICY "Candidates view own registrations"
ON public.registrations FOR SELECT TO authenticated
USING (
  candidate_id = auth.uid()
  OR public.current_user_has_any_role('admin','superadmin','invigilator')
);

CREATE POLICY "Candidates self-register unpaid"
ON public.registrations FOR INSERT TO authenticated
WITH CHECK (
  candidate_id = auth.uid()
  AND COALESCE(paid, false) = false
  AND admit_card_number IS NULL
);

CREATE POLICY "Admins manage registrations"
ON public.registrations FOR ALL TO authenticated
USING (public.current_user_has_any_role('admin','superadmin'))
WITH CHECK (public.current_user_has_any_role('admin','superadmin'));

-- Empty-question guard
CREATE OR REPLACE FUNCTION public.prevent_empty_question()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(BTRIM(NEW.question_text_encrypted), '') = '' THEN
    RAISE EXCEPTION 'question_text_encrypted is required';
  END IF;
  IF COALESCE(BTRIM(NEW.option_a_encrypted), '') = ''
     OR COALESCE(BTRIM(NEW.option_b_encrypted), '') = ''
     OR COALESCE(BTRIM(NEW.option_c_encrypted), '') = ''
     OR COALESCE(BTRIM(NEW.option_d_encrypted), '') = '' THEN
    RAISE EXCEPTION 'all four options (A, B, C, D) are required';
  END IF;
  IF COALESCE(BTRIM(NEW.correct_answer_encrypted), '') = '' THEN
    RAISE EXCEPTION 'correct_answer_encrypted is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_empty_question ON public.questions;
CREATE TRIGGER trg_prevent_empty_question
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.prevent_empty_question();

-- Helper: exam_has_complete_questions
CREATE OR REPLACE FUNCTION public.exam_has_complete_questions(_exam_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.questions q WHERE q.exam_id = _exam_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.questions q
       WHERE q.exam_id = _exam_id
         AND (
           COALESCE(BTRIM(q.question_text_encrypted), '') = ''
           OR COALESCE(BTRIM(q.option_a_encrypted), '') = ''
           OR COALESCE(BTRIM(q.option_b_encrypted), '') = ''
           OR COALESCE(BTRIM(q.option_c_encrypted), '') = ''
           OR COALESCE(BTRIM(q.option_d_encrypted), '') = ''
         )
     );
$$;

GRANT EXECUTE ON FUNCTION public.exam_has_complete_questions(uuid) TO authenticated, anon, service_role;

-- Rate limit table for /api/public endpoints (Wave 2 prep)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies → only service_role can read/write (it bypasses RLS).

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _max int, _window_seconds int)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _row public.rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.rate_limits WHERE key = _key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, window_start, count) VALUES (_key, _now, 1);
    RETURN true;
  END IF;
  IF _row.window_start < _now - make_interval(secs => _window_seconds) THEN
    UPDATE public.rate_limits SET window_start = _now, count = 1 WHERE key = _key;
    RETURN true;
  END IF;
  IF _row.count >= _max THEN
    RETURN false;
  END IF;
  UPDATE public.rate_limits SET count = count + 1 WHERE key = _key;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO service_role;

-- Webhook idempotency
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  event_id text PRIMARY KEY,
  source text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.processed_webhook_events TO service_role;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
