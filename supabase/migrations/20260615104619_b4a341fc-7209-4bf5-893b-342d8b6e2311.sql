
-- Tighten centers SELECT
DROP POLICY IF EXISTS "Authenticated read centers" ON public.centers;
CREATE POLICY "Centers visible to staff and registered candidates"
ON public.centers FOR SELECT TO authenticated
USING (
  public.current_user_has_any_role('admin','superadmin','invigilator')
  OR EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.center_id = centers.id AND r.candidate_id = auth.uid()
  )
);

-- Explicit INSERT policy for integrity_events: staff only.
-- The SECURITY DEFINER function public.log_integrity_event bypasses RLS for owner self-logging.
CREATE POLICY "Staff can insert integrity events"
ON public.integrity_events FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_has_any_role('admin','superadmin','invigilator')
);
