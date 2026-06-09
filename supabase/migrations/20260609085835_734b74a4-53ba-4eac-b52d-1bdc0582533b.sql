
-- 1) centers: restrict public read to authenticated
DROP POLICY IF EXISTS "Anyone reads centers" ON public.centers;
CREATE POLICY "Authenticated read centers" ON public.centers
  FOR SELECT TO authenticated USING (true);

-- 2) exams: anon sees only live, authenticated sees all
DROP POLICY IF EXISTS "Anyone reads exams" ON public.exams;
CREATE POLICY "Anon reads live exams" ON public.exams
  FOR SELECT TO anon USING (status = 'live');
CREATE POLICY "Authenticated read exams" ON public.exams
  FOR SELECT TO authenticated USING (true);

-- 3) questions: candidates can read questions for exams they are registered for and that are live
CREATE POLICY "Candidates read questions for own live exams" ON public.questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.exams e ON e.id = r.exam_id
      WHERE r.exam_id = questions.exam_id
        AND r.candidate_id = auth.uid()
        AND e.status = 'live'
    )
    OR public.current_user_has_any_role('admin','superadmin','invigilator')
  );

-- 4) storage: tighten institute read on session-recordings to own initiated sessions
DROP POLICY IF EXISTS "Staff read snapshots" ON storage.objects;
CREATE POLICY "Staff read snapshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-recordings'
    AND (
      public.current_user_has_any_role('admin','superadmin')
      OR (
        public.current_user_has_any_role('institute')
        AND EXISTS (
          SELECT 1 FROM public.trishield_watch_sessions s
          WHERE s.id::text = (storage.foldername(name))[3]
            AND s.initiated_by = auth.uid()
        )
      )
    )
  );

-- 5) realtime publication: drop unused tables so unrestricted channel subscription is impossible
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.integrity_events;
