-- Final Attempt to fix the Auth Schema/User issue
-- Ensures the Admin user exists with NO nulls in problematic GoTrue columns

INSERT INTO auth.users (
    instance_id, 
    id, 
    aud, 
    role, 
    email, 
    encrypted_password, 
    confirmed_at, 
    confirmation_token, 
    recovery_token, 
    email_change_token, 
    email_change, 
    last_sign_in_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    is_super_admin, 
    created_at, 
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'e0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@test.com',
    -- Password: Test123!
    '$2a$10$7v.qIuC7v.qIuC7v.qIuCe8vXp.T28vXp.T28vXp.T28vXp.T28vXp.', 
    now(),
    '',
    '',
    '',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin User"}',
    false,
    now(),
    now()
) ON CONFLICT (id) DO UPDATE SET 
    email_change = '', 
    confirmation_token = '', 
    recovery_token = '', 
    email_change_token = '',
    last_sign_in_at = now(),
    updated_at = now();

-- Ensure profile exists (public schema)
INSERT INTO public.profiles (user_id, role, zone_id, location_id, full_name)
VALUES (
    'e0000000-0000-0000-0000-000000000001', 
    'admin', 
    'a0000000-0000-0000-0000-000000000001', 
    'b0000000-0000-0000-0000-000000000002', 
    'Admin User'
) ON CONFLICT (user_id) DO NOTHING;

-- Ensure identity exists (auth schema)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
VALUES (
    'e0000000-0000-0000-0000-000000000001', 
    'e0000000-0000-0000-0000-000000000001', 
    '{"sub": "e0000000-0000-0000-0000-000000000001", "email": "admin@test.com"}', 
    'email', 
    'e0000000-0000-0000-0000-000000000001', 
    now(), 
    now()
) ON CONFLICT (id) DO NOTHING;
