
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_has_any_role(app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(app_role[]) TO authenticated, service_role;
