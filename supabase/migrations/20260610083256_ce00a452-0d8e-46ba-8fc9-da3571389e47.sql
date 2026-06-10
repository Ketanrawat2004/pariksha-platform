
-- Admins/superadmins can read payments (for fraud review & reconciliation)
DROP POLICY IF EXISTS "Staff can view all payments" ON public.payments;
CREATE POLICY "Staff can view all payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.current_user_has_any_role('admin','superadmin'));

-- Institutes can read TriShield session reports for sessions they initiated
DROP POLICY IF EXISTS "Institutes read own session reports" ON public.trishield_session_reports;
CREATE POLICY "Institutes read own session reports"
ON public.trishield_session_reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trishield_watch_sessions s
    WHERE s.id = trishield_session_reports.session_id
      AND s.initiated_by = auth.uid()
  )
);

-- Explicitly block candidates from updating their own registrations (documents intent)
DROP POLICY IF EXISTS "Candidates cannot update registrations" ON public.registrations;
CREATE POLICY "Candidates cannot update registrations"
ON public.registrations AS RESTRICTIVE FOR UPDATE
TO authenticated
USING (public.current_user_has_any_role('admin','superadmin'))
WITH CHECK (public.current_user_has_any_role('admin','superadmin'));
