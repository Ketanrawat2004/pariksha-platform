-- Revoke any direct Data API write access on integrity_events; writes go through public.log_integrity_event (SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE ON public.integrity_events FROM anon, authenticated;

-- Revoke any direct Data API write access on user_roles; role assignment goes through public.assign_signup_role (SECURITY DEFINER) which forbids self-elevation
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

-- Revoke any direct Data API write access on support_tickets; ticket creation goes through the server function using service_role
REVOKE INSERT, UPDATE, DELETE ON public.support_tickets FROM anon, authenticated;

-- service_role retains full access for trusted server-side paths
GRANT ALL ON public.integrity_events TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.support_tickets TO service_role;