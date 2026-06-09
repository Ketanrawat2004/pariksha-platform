-- Tighten paper_registrations: institutes no longer see candidate PII (phone, date_of_birth) on other candidates.
-- The existing SELECT policy granted institutes full-row read access to every registration on their submissions,
-- which leaked phone numbers and dates of birth. We split it: admins/superadmins keep full read; institutes lose
-- direct table read access. Candidates still see their own row via the existing "candidates manage own paper regs"
-- policy. If institute UIs need a roster, expose it later via a SECURITY DEFINER function that returns only safe
-- columns (full_name, admit_card_number, admit_released, paid, cancelled).

DROP POLICY IF EXISTS "admins read all paper regs" ON public.paper_registrations;

CREATE POLICY "admins and superadmins read all paper regs"
  ON public.paper_registrations
  FOR SELECT
  TO authenticated
  USING (public.current_user_has_any_role('admin', 'superadmin'));
