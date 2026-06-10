
-- Remove the dangerous self-insert policy
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- Secure server-side role assignment with staff-code gating
CREATE OR REPLACE FUNCTION public.assign_signup_role(_role public.app_role, _staff_code text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _expected text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Already has this role? no-op
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = _role) THEN
    RETURN;
  END IF;

  IF _role = 'candidate'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
    RETURN;
  END IF;

  _expected := CASE _role
    WHEN 'invigilator'::public.app_role THEN 'INVIG-2026'
    WHEN 'admin'::public.app_role       THEN 'ADMIN-2026'
    WHEN 'superadmin'::public.app_role  THEN 'SUPER-2026'
    WHEN 'institute'::public.app_role   THEN 'INST-2026'
    ELSE NULL
  END;

  IF _expected IS NULL OR _staff_code IS NULL OR upper(trim(_staff_code)) <> _expected THEN
    RAISE EXCEPTION 'Invalid staff access code for selected role' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_signup_role(public.app_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_signup_role(public.app_role, text) TO authenticated;
