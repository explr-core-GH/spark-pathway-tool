-- Seed a demo educator (pre-approved, STEM)
DO $$
DECLARE
  demo_id uuid := '00000000-0000-4000-8000-000000000001';
  demo_email text := 'demo.educator@explr.test';
  demo_password text := 'ExplrDemo2026!';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated',
      demo_email, crypt(demo_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), demo_id::text, demo_id,
      jsonb_build_object('sub', demo_id::text, 'email', demo_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO public.educators (id, full_name, email, organization, program_type, approved, role)
  VALUES (demo_id, 'Demo Educator', demo_email, 'EXPLR Demo School', 'stem'::program_type, true, 'educator'::educator_role)
  ON CONFLICT (id) DO UPDATE SET approved = true, program_type = 'stem'::program_type;
END $$;