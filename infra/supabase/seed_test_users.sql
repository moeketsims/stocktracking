-- Create test users in auth.users
-- Password for all test users: Test123!

-- Admin user
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@test.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Admin User"}'
) ON CONFLICT (id) DO NOTHING;

-- Zone Manager user
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    'e0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manager@test.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Zone Manager"}'
) ON CONFLICT (id) DO NOTHING;

-- Staff user
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    'e0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'staff@test.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Staff Member"}'
) ON CONFLICT (id) DO NOTHING;

-- Create profiles for test users
INSERT INTO profiles (user_id, role, zone_id, location_id, full_name) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'admin', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Admin User'),
    ('e0000000-0000-0000-0000-000000000002', 'zone_manager', 'a0000000-0000-0000-0000-000000000001', NULL, 'Zone Manager'),
    ('e0000000-0000-0000-0000-000000000003', 'staff', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Staff Member')
ON CONFLICT (user_id) DO NOTHING;

-- Create auth.identities entries (required for email login)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at,
    last_sign_in_at
) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '{"sub": "e0000000-0000-0000-0000-000000000001", "email": "admin@test.com"}', 'email', 'e0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),
    ('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '{"sub": "e0000000-0000-0000-0000-000000000002", "email": "manager@test.com"}', 'email', 'e0000000-0000-0000-0000-000000000002', NOW(), NOW(), NOW()),
    ('e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', '{"sub": "e0000000-0000-0000-0000-000000000003", "email": "staff@test.com"}', 'email', 'e0000000-0000-0000-0000-000000000003', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
