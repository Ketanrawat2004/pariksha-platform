DO $$
DECLARE
  uid_inst uuid := '44444444-4444-4444-4444-444444444444';
  pw text := crypt('Demo@1234', gen_salt('bf'));
BEGIN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES (uid_inst, '00000000-0000-0000-0000-000000000000', 'institute@pariksha.in', pw, now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{"full_name":"Demo Institute"}'::jsonb,
          'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), uid_inst, uid_inst::text,
          jsonb_build_object('sub', uid_inst::text, 'email','institute@pariksha.in','email_verified',true),
          'email', now(), now(), now())
  ON CONFLICT DO NOTHING;

  DELETE FROM public.user_roles WHERE user_id = uid_inst;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid_inst, 'institute');
END $$;