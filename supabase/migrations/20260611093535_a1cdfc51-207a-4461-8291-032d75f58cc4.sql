
-- 1. Tighten audit_log self-insert policy: limit non-staff inserts to a known set of actions
DROP POLICY IF EXISTS "Users insert own activity" ON public.audit_log;
CREATE POLICY "Users insert own activity"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND action = ANY (ARRAY[
    'signup','signin','signout',
    'password_reset_request','password_reset',
    'profile_update','paper_submit','paper_publish','paper_edit_request',
    'exam_start','exam_submit',
    'certificate_download','score_report_download','activity_report_download',
    'settings_change','role_change'
  ])
);

-- 2. Revoke EXECUTE on trigger-only helpers from public roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_exam_session_integrity_columns() FROM PUBLIC, anon, authenticated;
