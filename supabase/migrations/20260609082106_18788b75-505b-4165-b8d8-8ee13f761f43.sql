
DROP POLICY IF EXISTS "Parties update sessions" ON public.trishield_watch_sessions;
CREATE POLICY "Parties update sessions"
  ON public.trishield_watch_sessions FOR UPDATE TO authenticated
  USING (
    initiated_by = auth.uid()
    OR public.current_user_has_any_role('admin','superadmin')
  )
  WITH CHECK (
    initiated_by = auth.uid()
    OR public.current_user_has_any_role('admin','superadmin')
  );

DROP POLICY IF EXISTS "Staff insert reports" ON public.trishield_session_reports;
CREATE POLICY "Staff insert reports"
  ON public.trishield_session_reports FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role('admin','superadmin','institute'));

CREATE OR REPLACE FUNCTION public.increment_watch_snapshot(_session_id uuid, _party text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _initiated_by uuid;
BEGIN
  SELECT initiated_by INTO _initiated_by FROM public.trishield_watch_sessions WHERE id = _session_id;
  IF _initiated_by IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;

  IF _party = 'institute' THEN
    IF _initiated_by <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
    UPDATE public.trishield_watch_sessions SET institute_snapshot_count = institute_snapshot_count + 1 WHERE id = _session_id;
  ELSIF _party = 'admin' THEN
    IF NOT public.current_user_has_any_role('admin','superadmin') THEN RAISE EXCEPTION 'forbidden'; END IF;
    UPDATE public.trishield_watch_sessions SET admin_snapshot_count = admin_snapshot_count + 1 WHERE id = _session_id;
  ELSIF _party = 'superadmin' THEN
    IF NOT public.current_user_has_any_role('superadmin') THEN RAISE EXCEPTION 'forbidden'; END IF;
    UPDATE public.trishield_watch_sessions SET superadmin_snapshot_count = superadmin_snapshot_count + 1 WHERE id = _session_id;
  ELSE
    RAISE EXCEPTION 'invalid party %', _party;
  END IF;
END $$;
