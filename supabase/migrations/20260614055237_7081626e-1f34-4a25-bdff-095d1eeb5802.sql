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

  -- Rotated staff codes: previous codes (INVIG-2026, INST-2026) were leaked via
  -- the client bundle and must no longer be accepted.
  _expected := CASE _role
    WHEN 'invigilator'::public.app_role THEN 'PRK-INVIG-9F4K2-2026'
    WHEN 'institute'::public.app_role   THEN 'PRK-INST-7H2M8-2026'
    ELSE NULL
  END;

  IF _expected IS NULL OR _staff_code IS NULL OR upper(trim(_staff_code)) <> _expected THEN
    RAISE EXCEPTION 'Invalid staff access code for selected role' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
END;
$function$;