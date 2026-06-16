
-- 1) Restrict integrity_events direct inserts to staff only (force candidates through log_integrity_event RPC)
DROP POLICY IF EXISTS "deny_non_staff_direct_inserts" ON public.integrity_events;
CREATE POLICY "deny_non_staff_direct_inserts"
ON public.integrity_events
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.current_user_has_any_role('admin','superadmin','invigilator'));

-- 2) Realtime default-deny: restrictive policies that only allow approved topic prefixes
DROP POLICY IF EXISTS "default_deny_unapproved_topics_select" ON realtime.messages;
DROP POLICY IF EXISTS "default_deny_unapproved_topics_insert" ON realtime.messages;

CREATE POLICY "default_deny_unapproved_topics_select"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'trishield-watch:%' OR realtime.topic() LIKE 'paper-edit-activity:%')
  AND public.user_can_access_trishield_topic(realtime.topic())
);

CREATE POLICY "default_deny_unapproved_topics_insert"
ON realtime.messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() LIKE 'trishield-watch:%' OR realtime.topic() LIKE 'paper-edit-activity:%')
  AND public.user_can_access_trishield_topic(realtime.topic())
);

-- 3) Lock down SECURITY DEFINER function EXECUTE grants: revoke from PUBLIC, grant only intended roles
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Public-facing verification functions (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.verify_admit_card(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admit_anonymous(text, date, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_trishield_session_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_published_paper_summaries() TO anon, authenticated;

-- Authenticated-only helper RPCs
GRANT EXECUTE ON FUNCTION public.assign_signup_role(public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_integrity_event(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paper_submission_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_paper_admits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_watch_snapshot(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(VARIADIC public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exam_has_complete_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.paper_has_full_trishield(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_trishield_topic(text) TO authenticated;

-- Trigger / internal functions: leave EXECUTE revoked (no grants needed; triggers run as owner)
-- check_rate_limit, generate_trishield_join_code, verify_staff_code stay locked to service_role/owner.
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_trishield_join_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_staff_code(public.app_role, text) TO service_role;
