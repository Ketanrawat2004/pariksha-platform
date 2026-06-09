
-- 1) Storage: tighten INSERT on session-recordings so institute users
-- can only upload into folders for sessions they initiated.
DROP POLICY IF EXISTS "Watch parties write snapshots" ON storage.objects;
CREATE POLICY "Watch parties write snapshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-recordings'
  AND (
    (
      (storage.foldername(name))[1] = 'institute'
      AND public.current_user_has_any_role('institute')
      AND EXISTS (
        SELECT 1 FROM public.trishield_watch_sessions s
        WHERE s.id::text = (storage.foldername(name))[3]
          AND s.initiated_by = auth.uid()
      )
    )
    OR (
      (storage.foldername(name))[1] = 'admin'
      AND public.current_user_has_any_role('admin','superadmin')
    )
    OR (
      (storage.foldername(name))[1] = 'superadmin'
      AND public.current_user_has_any_role('superadmin')
    )
  )
);

-- 2) Realtime: tighten SELECT so institute users only receive
-- broadcasts for trishield sessions they initiated. Admin/superadmin
-- and paper-edit-activity channels keep their current access.
DROP POLICY IF EXISTS "Staff read trishield/paper-edit broadcast" ON realtime.messages;
CREATE POLICY "Staff read trishield/paper-edit broadcast"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() LIKE 'paper-edit-activity:%'
    AND public.current_user_has_any_role('admin','superadmin','institute')
  )
  OR (
    realtime.topic() LIKE 'trishield-watch:%'
    AND (
      public.current_user_has_any_role('admin','superadmin')
      OR (
        public.current_user_has_any_role('institute')
        AND EXISTS (
          SELECT 1 FROM public.trishield_watch_sessions s
          WHERE s.id::text = split_part(realtime.topic(), ':', 2)
            AND s.initiated_by = auth.uid()
        )
      )
    )
  )
);
