
-- Revoke EXECUTE from anon/authenticated on trigger-only and sensitive helper functions.
-- These are invoked only by triggers, RLS policies, or other SECURITY DEFINER functions,
-- so direct execution by clients is unnecessary and undesirable.

DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.touch_paper_submissions()',
    'public.touch_paper_registrations()',
    'public.touch_trishield_watch_sessions()',
    'public.touch_incidents()',
    'public.compute_all_parties_present()',
    'public.prevent_empty_question()',
    'public.guard_exam_session_integrity_columns()',
    'public.enforce_edit_request_trishield()',
    'public.handle_new_user()',
    'public.verify_staff_code(public.app_role, text)',
    'public.check_rate_limit(text, integer, integer)',
    'public.generate_trishield_join_code()',
    'public.exam_has_complete_questions(uuid)',
    'public.paper_has_full_trishield(uuid)',
    'public.user_can_access_trishield_topic(text)'
  ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
