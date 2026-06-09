
DROP POLICY IF EXISTS "Admins create notifications" ON public.notifications;
CREATE POLICY "Privileged roles create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin','institute'));

DROP POLICY IF EXISTS "Candidates read published submissions" ON public.paper_submissions;
CREATE POLICY "Candidates read published submissions" ON public.paper_submissions
  FOR SELECT TO authenticated
  USING (status = 'published' OR institute_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin'));
