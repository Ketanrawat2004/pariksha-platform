REVOKE EXECUTE ON FUNCTION public.paper_has_full_trishield(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.paper_has_full_trishield(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_edit_request_trishield() FROM PUBLIC, anon;