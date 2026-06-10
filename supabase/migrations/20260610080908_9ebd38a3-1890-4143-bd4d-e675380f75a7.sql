-- 1) paper_submissions: hide encrypted questions + passkey_hash from RLS reads.
-- The institute's own browser does not need these columns; admin server fns use service_role.
REVOKE SELECT (questions, passkey_hash) ON public.paper_submissions FROM authenticated;
REVOKE SELECT (questions, passkey_hash) ON public.paper_submissions FROM anon;

-- 2) session-recordings: explicit deny on UPDATE so no one can overwrite TriShield evidence.
CREATE POLICY "No overwrite of session recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING ((bucket_id = 'session-recordings') AND false)
WITH CHECK ((bucket_id = 'session-recordings') AND false);