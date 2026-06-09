
-- ============ trishield_watch_sessions ============
CREATE TABLE public.trishield_watch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  paper_submission_id uuid REFERENCES public.paper_submissions(id) ON DELETE CASCADE,
  session_type text NOT NULL CHECK (session_type IN ('paper_lock','paper_edit')),
  initiated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_joined_at timestamptz,
  superadmin_joined_at timestamptz,
  institute_camera_active boolean NOT NULL DEFAULT false,
  admin_camera_active boolean NOT NULL DEFAULT false,
  superadmin_camera_active boolean NOT NULL DEFAULT false,
  all_parties_present boolean NOT NULL DEFAULT false,
  session_started_at timestamptz NOT NULL DEFAULT now(),
  session_ended_at timestamptz,
  institute_snapshot_count integer NOT NULL DEFAULT 0,
  admin_snapshot_count integer NOT NULL DEFAULT 0,
  superadmin_snapshot_count integer NOT NULL DEFAULT 0,
  institute_ip text,
  admin_ip text,
  superadmin_ip text,
  institute_device_fingerprint jsonb,
  admin_device_fingerprint jsonb,
  superadmin_device_fingerprint jsonb,
  admin_confirmed boolean NOT NULL DEFAULT false,
  superadmin_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','halted','timed_out')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.trishield_watch_sessions TO authenticated;
GRANT ALL ON public.trishield_watch_sessions TO service_role;

ALTER TABLE public.trishield_watch_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institute reads own sessions"
  ON public.trishield_watch_sessions FOR SELECT TO authenticated
  USING (
    initiated_by = auth.uid()
    OR public.current_user_has_any_role('admin','superadmin','invigilator')
  );

CREATE POLICY "Institute inserts own sessions"
  ON public.trishield_watch_sessions FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND public.current_user_has_any_role('institute','admin','superadmin')
  );

CREATE POLICY "Parties update sessions"
  ON public.trishield_watch_sessions FOR UPDATE TO authenticated
  USING (
    initiated_by = auth.uid()
    OR public.current_user_has_any_role('admin','superadmin')
  )
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_trishield_watch_sessions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_touch_trishield_watch_sessions
  BEFORE UPDATE ON public.trishield_watch_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_trishield_watch_sessions();

-- Auto-flip all_parties_present when all three cameras are active
CREATE OR REPLACE FUNCTION public.compute_all_parties_present()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.all_parties_present := (NEW.institute_camera_active AND NEW.admin_camera_active AND NEW.superadmin_camera_active);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_compute_all_parties_present
  BEFORE INSERT OR UPDATE ON public.trishield_watch_sessions
  FOR EACH ROW EXECUTE FUNCTION public.compute_all_parties_present();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trishield_watch_sessions;

-- ============ trishield_session_reports ============
CREATE TABLE public.trishield_session_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.trishield_watch_sessions(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  session_type text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  institute_snapshot_count integer DEFAULT 0,
  admin_snapshot_count integer DEFAULT 0,
  superadmin_snapshot_count integer DEFAULT 0,
  institute_ip text,
  admin_ip text,
  superadmin_ip text,
  critical_actions jsonb DEFAULT '[]'::jsonb,
  final_paper_hash text,
  verification_status text CHECK (verification_status IN ('COMPLETE','INCOMPLETE')),
  incomplete_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.trishield_session_reports TO authenticated;
GRANT ALL ON public.trishield_session_reports TO service_role;

ALTER TABLE public.trishield_session_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read reports"
  ON public.trishield_session_reports FOR SELECT TO authenticated
  USING (public.current_user_has_any_role('admin','superadmin'));

CREATE POLICY "Staff insert reports"
  ON public.trishield_session_reports FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role('admin','superadmin','institute'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.trishield_session_reports;

-- ============ Atomic snapshot increment RPC ============
CREATE OR REPLACE FUNCTION public.increment_watch_snapshot(_session_id uuid, _party text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _party = 'institute' THEN
    UPDATE public.trishield_watch_sessions SET institute_snapshot_count = institute_snapshot_count + 1 WHERE id = _session_id;
  ELSIF _party = 'admin' THEN
    UPDATE public.trishield_watch_sessions SET admin_snapshot_count = admin_snapshot_count + 1 WHERE id = _session_id;
  ELSIF _party = 'superadmin' THEN
    UPDATE public.trishield_watch_sessions SET superadmin_snapshot_count = superadmin_snapshot_count + 1 WHERE id = _session_id;
  ELSE
    RAISE EXCEPTION 'invalid party %', _party;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.increment_watch_snapshot(uuid, text) TO authenticated;

-- ============ Storage policies on session-recordings bucket ============
-- Bucket created out-of-band (private). Authenticated staff & owners can read/write own party path.
CREATE POLICY "Watch parties write snapshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'session-recordings'
    AND (
      (split_part(name, '/', 1) = 'institute' AND public.current_user_has_any_role('institute','admin','superadmin'))
      OR (split_part(name, '/', 1) = 'admin' AND public.current_user_has_any_role('admin','superadmin'))
      OR (split_part(name, '/', 1) = 'superadmin' AND public.current_user_has_any_role('superadmin'))
    )
  );

CREATE POLICY "Staff read snapshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-recordings'
    AND public.current_user_has_any_role('admin','superadmin','institute')
  );

CREATE POLICY "Staff delete snapshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'session-recordings'
    AND public.current_user_has_any_role('admin','superadmin')
  );
