
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
  _expected := CASE _role
    WHEN 'invigilator'::public.app_role THEN 'PRK-INVIG-R7T4Q-2026'
    WHEN 'institute'::public.app_role   THEN 'PRK-INST-X3B9V-2026'
    ELSE NULL
  END;
  IF _expected IS NULL OR _staff_code IS NULL OR upper(trim(_staff_code)) <> _expected THEN
    RAISE EXCEPTION 'Invalid staff access code for selected role' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _requested_role_text text := lower(coalesce(NEW.raw_user_meta_data->>'registration_role', 'candidate'));
  _requested_role public.app_role := 'candidate'::public.app_role;
  _staff_code text := NEW.raw_user_meta_data->>'staff_code';
  _expected_code text;
  _date_of_birth date;
BEGIN
  IF nullif(NEW.raw_user_meta_data->>'date_of_birth', '') IS NOT NULL THEN
    BEGIN
      _date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::date;
    EXCEPTION WHEN others THEN
      _date_of_birth := NULL;
    END;
  END IF;
  IF _requested_role_text IN ('candidate', 'invigilator', 'institute') THEN
    _requested_role := _requested_role_text::public.app_role;
  ELSIF _requested_role_text IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Admin and super admin accounts require existing admin approval' USING ERRCODE = '42501';
  END IF;
  IF _requested_role <> 'candidate'::public.app_role THEN
    _expected_code := CASE _requested_role
      WHEN 'invigilator'::public.app_role THEN 'PRK-INVIG-R7T4Q-2026'
      WHEN 'institute'::public.app_role THEN 'PRK-INST-X3B9V-2026'
      ELSE NULL
    END;
    IF _expected_code IS NULL OR _staff_code IS NULL OR upper(trim(_staff_code)) <> _expected_code THEN
      RAISE EXCEPTION 'Invalid staff access code for selected role' USING ERRCODE = '42501';
    END IF;
  END IF;
  INSERT INTO public.profiles (
    id, full_name, email, phone, date_of_birth, gender, state, aadhaar_hash, photo_url
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'phone', '')), ''),
    _date_of_birth,
    NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'gender', '')), ''),
    NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'state', '')), ''),
    NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'aadhaar_hash', '')), ''),
    NULLIF(NEW.raw_user_meta_data->>'photo_url', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;
