
-- 1) AUDIT LOG: tighten insert
DROP POLICY IF EXISTS "Anyone authenticated inserts audit" ON public.audit_log;
CREATE POLICY "Staff insert own audit rows"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT DISTINCT FROM auth.uid()
  AND public.current_user_has_any_role('admin','superadmin','invigilator')
);

-- 2) REGISTRATIONS: drop public/anon read
DROP POLICY IF EXISTS "Public verify by admit card" ON public.registrations;

CREATE OR REPLACE FUNCTION public.verify_admit_card(_admit_card_number text)
RETURNS TABLE (exam_title text, exam_date date, valid boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.title, e.exam_date, true
  FROM public.registrations r
  JOIN public.exams e ON e.id = r.exam_id
  WHERE r.admit_card_number = _admit_card_number
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_admit_card(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admit_card(text) TO anon, authenticated;

-- 3) RESULTS: drop public read + candidate write
DROP POLICY IF EXISTS "Anyone verifies certificates" ON public.results;
DROP POLICY IF EXISTS "Candidates insert own results" ON public.results;
DROP POLICY IF EXISTS "Candidates update own results" ON public.results;

CREATE OR REPLACE FUNCTION public.verify_certificate(_certificate_id text)
RETURNS TABLE (exam_title text, exam_date date, pass_fail boolean, percentage numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.title, e.exam_date, r.pass_fail, r.percentage
  FROM public.results r
  JOIN public.exams e ON e.id = r.exam_id
  WHERE r.certificate_id = _certificate_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 4) REALTIME messages: scope sensitive broadcast topics to staff/owner
-- Allow institute owner + admin/superadmin to publish/subscribe on trishield-watch:<sessionId> and paper-edit-activity:<sessionId>
CREATE POLICY "Staff read trishield/paper-edit broadcast"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() LIKE 'trishield-watch:%'
    OR realtime.topic() LIKE 'paper-edit-activity:%'
  )
  AND public.current_user_has_any_role('admin','superadmin','institute')
);

CREATE POLICY "Staff write trishield/paper-edit broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    realtime.topic() LIKE 'trishield-watch:%'
    OR realtime.topic() LIKE 'paper-edit-activity:%'
  )
  AND public.current_user_has_any_role('admin','superadmin','institute')
);
