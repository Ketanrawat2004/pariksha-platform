
-- Lock down server-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_admit_anonymous(text, date, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.exam_has_complete_questions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Drop redundant always-true policy. service_role bypasses RLS by design;
-- the policy is unnecessary and triggers the "policy always true" linter.
DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;
