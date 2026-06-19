
-- 1. Remove paper_submissions from realtime publication to avoid broadcasting
--    sensitive columns (questions, passkey_hash, admin_note, edit_request_note).
ALTER PUBLICATION supabase_realtime DROP TABLE public.paper_submissions;

-- 2. Tighten exam_sessions UPDATE policy at policy level (defence-in-depth
--    on top of existing guard trigger). Candidates may only modify
--    ended_at / is_submitted / submitted_at on their own row; integrity
--    columns must remain unchanged.
DROP POLICY IF EXISTS "Candidates update own sessions" ON public.exam_sessions;

CREATE POLICY "Candidates update own sessions"
ON public.exam_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.id = exam_sessions.registration_id
      AND (
        r.candidate_id = auth.uid()
        OR public.current_user_has_any_role('admin','superadmin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.id = exam_sessions.registration_id
      AND (
        r.candidate_id = auth.uid()
        OR public.current_user_has_any_role('admin','superadmin')
      )
  )
  AND (
    -- Staff bypass the column lock
    public.current_user_has_any_role('admin','superadmin','invigilator')
    OR (
      -- Candidates may NOT change integrity/identity columns
      integrity_score IS NOT DISTINCT FROM (SELECT s.integrity_score FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
      AND is_flagged IS NOT DISTINCT FROM (SELECT s.is_flagged FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
      AND flag_reasons IS NOT DISTINCT FROM (SELECT s.flag_reasons FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
      AND device_fingerprint IS NOT DISTINCT FROM (SELECT s.device_fingerprint FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
      AND ip_address IS NOT DISTINCT FROM (SELECT s.ip_address FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
      AND browser_info IS NOT DISTINCT FROM (SELECT s.browser_info FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
      AND registration_id IS NOT DISTINCT FROM (SELECT s.registration_id FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
      AND started_at IS NOT DISTINCT FROM (SELECT s.started_at FROM public.exam_sessions s WHERE s.id = exam_sessions.id)
    )
  )
);
