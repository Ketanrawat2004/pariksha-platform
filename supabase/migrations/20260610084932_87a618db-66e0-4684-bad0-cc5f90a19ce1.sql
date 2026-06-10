
-- 1) exam_sessions: prevent candidates from tampering with integrity_score, is_flagged, flag_reasons
CREATE OR REPLACE FUNCTION public.guard_exam_session_integrity_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / postgres unconditionally
  IF current_setting('request.jwt.claim.role', true) IS NULL
     OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Staff (admin/superadmin) may freely modify integrity fields
  IF public.current_user_has_any_role('admin','superadmin','invigilator') THEN
    RETURN NEW;
  END IF;

  -- Everyone else (candidates) must not change integrity columns
  IF NEW.integrity_score IS DISTINCT FROM OLD.integrity_score
     OR NEW.is_flagged   IS DISTINCT FROM OLD.is_flagged
     OR NEW.flag_reasons IS DISTINCT FROM OLD.flag_reasons THEN
    RAISE EXCEPTION 'Candidates cannot modify integrity_score / is_flagged / flag_reasons';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_exam_session_integrity ON public.exam_sessions;
CREATE TRIGGER trg_guard_exam_session_integrity
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_exam_session_integrity_columns();

-- 2) integrity_events: remove candidate INSERT policy; writes now flow through a SECURITY DEFINER server fn
DROP POLICY IF EXISTS "Session owner inserts events" ON public.integrity_events;

CREATE OR REPLACE FUNCTION public.log_integrity_event(
  _session_id uuid,
  _event_type text,
  _severity text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT r.candidate_id INTO _owner
  FROM public.exam_sessions s
  JOIN public.registrations r ON r.id = s.registration_id
  WHERE s.id = _session_id;

  IF _owner IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;

  IF _owner <> _uid AND NOT public.current_user_has_any_role('admin','superadmin','invigilator') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.integrity_events (session_id, event_type, severity, details)
  VALUES (_session_id, _event_type, _severity, _details)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_integrity_event(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_integrity_event(uuid, text, text, jsonb) TO authenticated;

-- 3) paper_submissions: hide sensitive columns from API SELECT (questions jsonb + passkey_hash)
REVOKE SELECT (questions, passkey_hash) ON public.paper_submissions FROM authenticated;
REVOKE SELECT (questions, passkey_hash) ON public.paper_submissions FROM anon;

-- Allow institutes to load their own questions for editing through a security-definer fn
CREATE OR REPLACE FUNCTION public.get_paper_submission_questions(_paper_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _institute uuid;
  _questions jsonb;
BEGIN
  SELECT institute_id, questions INTO _institute, _questions
  FROM public.paper_submissions
  WHERE id = _paper_id;

  IF _institute IS NULL THEN RAISE EXCEPTION 'not found'; END IF;

  IF _institute <> auth.uid() AND NOT public.current_user_has_any_role('admin','superadmin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN COALESCE(_questions, '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.get_paper_submission_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_paper_submission_questions(uuid) TO authenticated;

-- 4) trishield_session_reports: institute INSERT must be scoped to sessions they initiated
DROP POLICY IF EXISTS "Staff insert reports" ON public.trishield_session_reports;
CREATE POLICY "Staff insert reports"
ON public.trishield_session_reports
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_has_any_role('admin','superadmin')
  OR (
    public.current_user_has_any_role('institute')
    AND EXISTS (
      SELECT 1 FROM public.trishield_watch_sessions s
      WHERE s.id = trishield_session_reports.session_id
        AND s.initiated_by = auth.uid()
    )
  )
);

-- Also scope UPDATE the same way (institutes editing their own reports)
DROP POLICY IF EXISTS "Staff update reports" ON public.trishield_session_reports;
CREATE POLICY "Staff update reports"
ON public.trishield_session_reports
FOR UPDATE
TO authenticated
USING (
  public.current_user_has_any_role('admin','superadmin')
  OR (
    public.current_user_has_any_role('institute')
    AND EXISTS (
      SELECT 1 FROM public.trishield_watch_sessions s
      WHERE s.id = trishield_session_reports.session_id
        AND s.initiated_by = auth.uid()
    )
  )
)
WITH CHECK (
  public.current_user_has_any_role('admin','superadmin')
  OR (
    public.current_user_has_any_role('institute')
    AND EXISTS (
      SELECT 1 FROM public.trishield_watch_sessions s
      WHERE s.id = trishield_session_reports.session_id
        AND s.initiated_by = auth.uid()
    )
  )
);

-- 5) realtime broadcast: pin publisher to the specific session referenced in the topic
CREATE OR REPLACE FUNCTION public.user_can_access_trishield_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _initiated_by uuid;
BEGIN
  IF _topic IS NULL THEN RETURN false; END IF;

  BEGIN
    _id := split_part(_topic, ':', 2)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- Admin/superadmin can access any session topic
  IF public.current_user_has_any_role('admin','superadmin') THEN
    RETURN EXISTS (SELECT 1 FROM public.trishield_watch_sessions WHERE id = _id);
  END IF;

  SELECT initiated_by INTO _initiated_by
  FROM public.trishield_watch_sessions WHERE id = _id;

  RETURN _initiated_by IS NOT NULL AND _initiated_by = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.user_can_access_trishield_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_trishield_topic(text) TO authenticated;

DROP POLICY IF EXISTS "Staff read trishield/paper-edit broadcast" ON realtime.messages;
CREATE POLICY "Staff read trishield/paper-edit broadcast"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'trishield-watch:%' OR realtime.topic() LIKE 'paper-edit-activity:%')
  AND public.user_can_access_trishield_topic(realtime.topic())
);

DROP POLICY IF EXISTS "Staff write trishield/paper-edit broadcast" ON realtime.messages;
CREATE POLICY "Staff write trishield/paper-edit broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() LIKE 'trishield-watch:%' OR realtime.topic() LIKE 'paper-edit-activity:%')
  AND public.user_can_access_trishield_topic(realtime.topic())
);
