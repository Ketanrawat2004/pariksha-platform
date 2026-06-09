
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.current_user_has_any_role('admin','superadmin'));

DROP POLICY IF EXISTS "staff read all paper regs" ON public.paper_registrations;
CREATE POLICY "admins read all paper regs" ON public.paper_registrations
FOR SELECT TO authenticated
USING (
  public.current_user_has_any_role('admin','superadmin')
  OR EXISTS (
    SELECT 1 FROM public.paper_submissions ps
    WHERE ps.id = paper_registrations.paper_submission_id
      AND ps.institute_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated read exams" ON public.exams;
CREATE POLICY "Authenticated read live exams" ON public.exams
FOR SELECT TO authenticated
USING (
  status = 'live'
  OR public.current_user_has_any_role('admin','superadmin','invigilator')
);

DROP POLICY IF EXISTS "Staff read snapshots" ON storage.objects;
CREATE POLICY "Staff read snapshots" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'session-recordings'
  AND (
    public.current_user_has_any_role('admin','superadmin')
    OR (
      public.current_user_has_any_role('institute')
      AND (storage.foldername(name))[1] = 'institute'
      AND EXISTS (
        SELECT 1 FROM public.trishield_watch_sessions s
        WHERE s.id::text = (storage.foldername(name))[3]
          AND s.initiated_by = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users delete own face photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'face-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
