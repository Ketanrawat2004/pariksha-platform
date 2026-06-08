DO $$
DECLARE
  uid_super uuid := '11111111-1111-1111-1111-111111111111';
  uid_admin uuid := '22222222-2222-2222-2222-222222222222';
  uid_invig uuid := '33333333-3333-3333-3333-333333333333';
  uid_cand  uuid := '55555555-5555-5555-5555-555555555555';
  pw text := crypt('Demo@1234', gen_salt('bf'));
  exam_uuid uuid := '66666666-6666-6666-6666-666666666666';
  center_uuid uuid := '77777777-7777-7777-7777-777777777777';
  reg_uuid uuid := '88888888-8888-8888-8888-888888888888';
  i int;
  sub text;
  sub_arr text[] := ARRAY['Physics','Chemistry','Mathematics'];
BEGIN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES
    (uid_super, '00000000-0000-0000-0000-000000000000', 'super@pariksha.in',     pw, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Super Admin"}'::jsonb,     'authenticated', 'authenticated', now(), now()),
    (uid_admin, '00000000-0000-0000-0000-000000000000', 'admin@pariksha.in',     pw, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Pariksha Admin"}'::jsonb,  'authenticated', 'authenticated', now(), now()),
    (uid_invig, '00000000-0000-0000-0000-000000000000', 'invig@pariksha.in',     pw, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Invigilator One"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (uid_cand,  '00000000-0000-0000-0000-000000000000', 'candidate@pariksha.in', pw, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Demo Candidate"}'::jsonb,  'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), uid_super, uid_super::text, jsonb_build_object('sub', uid_super::text, 'email','super@pariksha.in','email_verified',true), 'email', now(), now(), now()),
    (gen_random_uuid(), uid_admin, uid_admin::text, jsonb_build_object('sub', uid_admin::text, 'email','admin@pariksha.in','email_verified',true), 'email', now(), now(), now()),
    (gen_random_uuid(), uid_invig, uid_invig::text, jsonb_build_object('sub', uid_invig::text, 'email','invig@pariksha.in','email_verified',true), 'email', now(), now(), now()),
    (gen_random_uuid(), uid_cand,  uid_cand::text,  jsonb_build_object('sub', uid_cand::text,  'email','candidate@pariksha.in','email_verified',true), 'email', now(), now(), now())
  ON CONFLICT DO NOTHING;

  DELETE FROM public.user_roles WHERE user_id IN (uid_super, uid_admin, uid_invig, uid_cand);
  INSERT INTO public.user_roles (user_id, role) VALUES
    (uid_super,'superadmin'),
    (uid_admin,'admin'),
    (uid_invig,'invigilator'),
    (uid_cand, 'candidate');

  INSERT INTO public.centers (id, name, district, state, pincode, capacity, is_verified, invigilator_id)
  VALUES (center_uuid, 'NIT Jamshedpur Examination Center', 'Jamshedpur', 'Jharkhand', '831014', 500, true, uid_invig)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.exams (id, title, subject, description, exam_date, start_time, duration_minutes, total_marks, passing_marks, status, created_by)
  VALUES (exam_uuid, 'JEE Mains 2026 — January Session', 'Engineering Entrance', 'Joint Entrance Examination — Physics, Chemistry, Mathematics. 75 questions, 4 marks each, -1 negative marking for MCQ.', CURRENT_DATE, '09:00:00', 180, 300, 90, 'live', uid_admin)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE exam_id = exam_uuid) THEN
    FOR i IN 1..75 LOOP
      sub := sub_arr[((i-1)/25)+1];
      INSERT INTO public.questions (exam_id, question_text_encrypted, option_a_encrypted, option_b_encrypted, option_c_encrypted, option_d_encrypted, correct_answer_encrypted, marks, question_order, category)
      VALUES (
        exam_uuid,
        sub || ' Q' || ((i-1) % 25 + 1) || ': A particle of mass m moves under a force F = ' || (i*2) || 'x N. If the initial velocity is ' || i || ' m/s and the displacement is ' || (i+5) || ' m, determine the work-energy relationship that governs the system. Which option correctly identifies the conserved quantity?',
        'The total mechanical energy equals ' || (i*4) || ' J and remains constant throughout the motion',
        'Only the kinetic energy is conserved with magnitude ' || (i*3) || ' J across all reference frames',
        'The momentum p = ' || (i*5) || ' kg·m/s is the sole conserved quantity in this configuration',
        'Both energy and momentum are non-conserved due to the position-dependent force',
        CASE (i % 4) WHEN 0 THEN 'A' WHEN 1 THEN 'B' WHEN 2 THEN 'C' ELSE 'D' END,
        4, i, sub
      );
    END LOOP;
  END IF;

  INSERT INTO public.registrations (id, candidate_id, exam_id, center_id, seat_number, status)
  VALUES (reg_uuid, uid_cand, exam_uuid, center_uuid, 'A-101', 'approved')
  ON CONFLICT (id) DO NOTHING;
END $$;