
-- 1. Drop overly-permissive public INSERT policies; writes go through server functions using service_role.
DROP POLICY IF EXISTS "anyone can insert pings" ON public.status_pings;
DROP POLICY IF EXISTS "anyone can submit tickets" ON public.support_tickets;

-- 2. Tighten notifications INSERT: institute users cannot blast arbitrary user_ids.
--    Only self-targeted notifications, or admin/superadmin, are allowed via the Data API.
--    Institute-to-candidate notifications should be created via a server function using service_role.
DROP POLICY IF EXISTS "Privileged roles create notifications" ON public.notifications;
CREATE POLICY "Users and admins create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.current_user_has_any_role('admin','superadmin')
  );

-- 3. Harden assign_signup_role: forbid self-promotion to admin/superadmin
--    regardless of any leaked staff code. Only an existing admin/superadmin
--    may grant those roles, via a separate path (not this RPC).
CREATE OR REPLACE FUNCTION public.assign_signup_role(_role app_role, _staff_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _expected text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Block self-elevation to admin/superadmin via this RPC entirely.
  IF _role IN ('admin'::public.app_role, 'superadmin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin/superadmin roles cannot be self-assigned' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = _role) THEN
    RETURN;
  END IF;

  IF _role = 'candidate'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
    RETURN;
  END IF;

  _expected := CASE _role
    WHEN 'invigilator'::public.app_role THEN 'INVIG-2026'
    WHEN 'institute'::public.app_role   THEN 'INST-2026'
    ELSE NULL
  END;

  IF _expected IS NULL OR _staff_code IS NULL OR upper(trim(_staff_code)) <> _expected THEN
    RAISE EXCEPTION 'Invalid staff access code for selected role' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
END;
$function$;

-- 4. Harden realtime topic gate: require session_type to match the topic prefix,
--    so a `paper_lock` session cannot be reused to subscribe to a
--    `paper-edit-activity:<id>` channel and vice versa.
CREATE OR REPLACE FUNCTION public.user_can_access_trishield_topic(_topic text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _initiated_by uuid;
  _session_type text;
  _prefix text;
  _expected_type text;
BEGIN
  IF _topic IS NULL THEN RETURN false; END IF;

  _prefix := split_part(_topic, ':', 1);
  _expected_type := CASE _prefix
    WHEN 'trishield-watch' THEN 'paper_lock'
    WHEN 'paper-edit-activity' THEN 'paper_edit'
    ELSE NULL
  END;
  IF _expected_type IS NULL THEN RETURN false; END IF;

  BEGIN
    _id := split_part(_topic, ':', 2)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  SELECT initiated_by, session_type::text
    INTO _initiated_by, _session_type
  FROM public.trishield_watch_sessions
  WHERE id = _id;

  IF _initiated_by IS NULL OR _session_type <> _expected_type THEN
    RETURN false;
  END IF;

  IF public.current_user_has_any_role('admin','superadmin') THEN
    RETURN true;
  END IF;

  RETURN _initiated_by = auth.uid();
END;
$function$;
