
-- 1) paper_submissions.questions JSONB: prevent institutes from reading the
--    raw questions column (which may include correct answers). Admins/superadmins
--    still need access; we enforce via column-level GRANTs combined with RLS.
REVOKE SELECT ON public.paper_submissions FROM authenticated;
GRANT SELECT (
  id, institute_id, title, subject, description, exam_date, start_time,
  duration_minutes, total_marks, passing_marks, teacher_name,
  submitter_photo_url, status, edit_request_note, admin_note,
  published_exam_id, created_at, updated_at
) ON public.paper_submissions TO authenticated;
-- service_role retains full access (already granted via ALL).

-- 2) payments INSERT: restrict candidate inserts so Stripe identifiers cannot be
--    fabricated. Only allow status='pending' rows owned by the user with NULL
--    stripe_* fields. Server (service_role) writes the real Stripe ids.
DROP POLICY IF EXISTS "Users can insert pending payments" ON public.payments;
CREATE POLICY "Users can insert pending payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(status::text, 'pending') = 'pending'
    AND stripe_customer_id IS NULL
    AND stripe_session_id IS NULL
    AND stripe_payment_intent_id IS NULL
  );

-- 3) trishield_session_reports: remove from Realtime publication. Staff read
--    via standard queries; no client needs live row events here.
ALTER PUBLICATION supabase_realtime DROP TABLE public.trishield_session_reports;

-- 4) trishield_watch_sessions: stop leaking every session (join codes, IPs,
--    device fingerprints) to all invigilators via Realtime row events.
DROP POLICY IF EXISTS "Institute reads own sessions" ON public.trishield_watch_sessions;
CREATE POLICY "Institute reads own sessions"
  ON public.trishield_watch_sessions
  FOR SELECT
  TO authenticated
  USING (
    initiated_by = auth.uid()
    OR current_user_has_any_role('admin'::app_role, 'superadmin'::app_role)
  );

-- 5) rate_limits & processed_webhook_events are server-only (service_role).
--    Add an explicit restrictive policy denying all client access so the linter
--    is satisfied and intent is documented.
CREATE POLICY "Deny all client access" ON public.rate_limits
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny all client access" ON public.processed_webhook_events
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
