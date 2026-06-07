
CREATE POLICY "Users upload own face photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'face-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own face photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'face-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_has_any_role('admin','superadmin','invigilator')));
CREATE POLICY "Users update own face photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'face-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
