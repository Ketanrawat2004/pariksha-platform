
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no client access" ON public.app_config;
CREATE POLICY "no client access" ON public.app_config FOR SELECT USING (false);

INSERT INTO public.app_config(key, value) VALUES
  ('staff_code_invigilator_sha256', '5408cde94707a842b7cab92befb2483bfe2e2630596f58a801f0421d094adf2c'),
  ('staff_code_institute_sha256',   'e65b55b13affa180725e0bfa39d38ce9edeed425390eb431f8089fb460bab8d0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.verify_staff_code(_role public.app_role, _code text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _key text; _expected text; _provided_hash text;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RETURN false; END IF;
  _key := CASE _role
    WHEN 'invigilator'::public.app_role THEN 'staff_code_invigilator_sha256'
    WHEN 'institute'::public.app_role THEN 'staff_code_institute_sha256'
    ELSE NULL END;
  IF _key IS NULL THEN RETURN false; END IF;
  SELECT value INTO _expected FROM public.app_config WHERE key = _key;
  IF _expected IS NULL THEN RETURN false; END IF;
  _provided_hash := encode(extensions.digest(upper(trim(_code)), 'sha256'), 'hex');
  RETURN _provided_hash = _expected;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_signup_role(_role public.app_role, _staff_code text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  IF _role IN ('admin'::public.app_role, 'superadmin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin/superadmin roles cannot be self-assigned' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = _role) THEN RETURN; END IF;
  IF _role = 'candidate'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
    RETURN;
  END IF;
  IF NOT public.verify_staff_code(_role, _staff_code) THEN
    RAISE EXCEPTION 'Invalid staff access code for selected role' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _requested_role_text text := lower(coalesce(NEW.raw_user_meta_data->>'registration_role', 'candidate'));
  _requested_role public.app_role := 'candidate'::public.app_role;
  _staff_code text := NEW.raw_user_meta_data->>'staff_code';
  _date_of_birth date;
BEGIN
  IF nullif(NEW.raw_user_meta_data->>'date_of_birth', '') IS NOT NULL THEN
    BEGIN _date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::date;
    EXCEPTION WHEN others THEN _date_of_birth := NULL; END;
  END IF;
  IF _requested_role_text IN ('candidate', 'invigilator', 'institute') THEN
    _requested_role := _requested_role_text::public.app_role;
  ELSIF _requested_role_text IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Admin and super admin accounts require existing admin approval' USING ERRCODE = '42501';
  END IF;
  IF _requested_role <> 'candidate'::public.app_role THEN
    IF NOT public.verify_staff_code(_requested_role, _staff_code) THEN
      RAISE EXCEPTION 'Invalid staff access code for selected role' USING ERRCODE = '42501';
    END IF;
  END IF;
  INSERT INTO public.profiles (id, full_name, email, phone, date_of_birth, gender, state, aadhaar_hash, photo_url)
  VALUES (
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
$$;

CREATE OR REPLACE FUNCTION public.guard_exam_session_integrity_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS NULL
     OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.current_user_has_any_role('admin','superadmin','invigilator') THEN
    RETURN NEW;
  END IF;
  IF NEW.integrity_score IS DISTINCT FROM OLD.integrity_score
     OR NEW.is_flagged   IS DISTINCT FROM OLD.is_flagged
     OR NEW.flag_reasons IS DISTINCT FROM OLD.flag_reasons
     OR NEW.browser_info IS DISTINCT FROM OLD.browser_info
     OR NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint
     OR NEW.ip_address IS DISTINCT FROM OLD.ip_address
     OR NEW.registration_id IS DISTINCT FROM OLD.registration_id
     OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'Candidates cannot modify protected exam_session columns';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_exam_session_integrity_columns ON public.exam_sessions;
CREATE TRIGGER guard_exam_session_integrity_columns
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_exam_session_integrity_columns();

DROP POLICY IF EXISTS "Staff can insert integrity events" ON public.integrity_events;
CREATE POLICY "Staff can insert integrity events" ON public.integrity_events
FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_has_any_role('admin'::public.app_role, 'superadmin'::public.app_role, 'invigilator'::public.app_role)
  AND EXISTS (SELECT 1 FROM public.exam_sessions s WHERE s.id = session_id)
);

REVOKE ALL ON public.paper_submissions FROM authenticated;
GRANT SELECT (
  id, institute_id, title, subject, description, exam_date, start_time, duration_minutes,
  total_marks, passing_marks, teacher_name, submitter_photo_url, status, published_exam_id,
  edit_request_note, admin_note, created_at, updated_at
) ON public.paper_submissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.paper_submissions TO authenticated;
GRANT ALL ON public.paper_submissions TO service_role;
