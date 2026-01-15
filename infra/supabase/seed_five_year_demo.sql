-- Potato Stock Tracking - 5-Year Demo Data Seed
-- =============================================
-- This script populates the database with 5 years of realistic demo data.
--
-- Prerequisites:
--   1. Run all migrations first (schema, RLS, etc.)
--   2. Run seed.sql for base data (zones, locations, items, suppliers, admin user)
--
-- Usage:
--   psql -d your_database -f seed_five_year_demo.sql
--   OR in Supabase SQL Editor: Copy/paste and run
--
-- Estimated run time: 2-5 minutes depending on hardware
-- Data generated: ~50,000+ transactions, ~8,000+ batches, ~40,000+ usage logs

-- ============================================
-- 1. ENSURE BASE DATA EXISTS
-- ============================================

-- Insert Zone if not exists
INSERT INTO zones (id, name) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Central Zone')
ON CONFLICT (id) DO NOTHING;

-- Insert Locations if not exists
INSERT INTO locations (id, zone_id, type, name, address) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'warehouse', 'Central Warehouse', '100 Industrial Road'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'shop', 'Shop 1 - Downtown', '1 Main Street'),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'shop', 'Shop 2 - Mall', '200 Shopping Center'),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'shop', 'Shop 3 - Airport', '300 Airport Terminal'),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'shop', 'Shop 4 - University', '400 Campus Drive'),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'shop', 'Shop 5 - Station', '500 Railway Square')
ON CONFLICT (id) DO NOTHING;

-- Insert base Items if not exists
INSERT INTO items (id, sku, name, unit, conversion_factor) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'POT-001', 'Potatoes', 'kg', 1.0),
    ('c0000000-0000-0000-0000-000000000002', 'POT-BAG', 'Potatoes (10kg bag)', 'bag', 10.0)
ON CONFLICT (id) DO NOTHING;

-- Insert additional Items for variety
INSERT INTO items (id, sku, name, unit, conversion_factor) VALUES
    ('c0000000-0000-0000-0000-000000000003', 'POT-WASH', 'Washed Potatoes', 'kg', 1.0),
    ('c0000000-0000-0000-0000-000000000004', 'POT-BABY', 'Baby Potatoes', 'kg', 1.0),
    ('c0000000-0000-0000-0000-000000000005', 'POT-SWT', 'Sweet Potatoes', 'kg', 1.0),
    ('c0000000-0000-0000-0000-000000000006', 'POT-BAG5', 'Potatoes (5kg bag)', 'bag', 5.0)
ON CONFLICT (id) DO NOTHING;

-- Insert Suppliers if not exists
INSERT INTO suppliers (id, name, contact_name, contact_phone, contact_email) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'FreshFarm Potatoes', 'John Farmer', '+27 11 123 4567', 'orders@freshfarm.co.za'),
    ('d0000000-0000-0000-0000-000000000002', 'Golden Harvest Ltd', 'Sarah Gold', '+27 11 234 5678', 'supply@goldenharvest.co.za'),
    ('d0000000-0000-0000-0000-000000000003', 'Valley Produce', 'Mike Valley', '+27 11 345 6789', 'sales@valleyproduce.co.za')
ON CONFLICT (id) DO NOTHING;

-- Insert Item-Supplier relationships
INSERT INTO item_suppliers (item_id, supplier_id, lead_time_days, min_order_qty, price_per_unit, is_preferred) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 2, 50, 12.50, TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 2, 5, 120.00, TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 2, 100, 14.50, TRUE),
    ('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 3, 50, 18.00, TRUE),
    ('c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003', 2, 80, 16.00, TRUE),
    ('c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 2, 20, 55.00, FALSE),
    ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 3, 100, 13.00, FALSE),
    ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 2, 10, 115.00, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREATE ADMIN USER IF NOT EXISTS
-- ============================================

-- Note: This requires the pgcrypto extension for password hashing
-- If running in Supabase, this should already be available

DO $$
BEGIN
    -- Check if admin user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@test.com') THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, email_change,
            email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            'e0000000-0000-0000-0000-000000000001',
            'authenticated', 'authenticated', 'admin@test.com',
            crypt('Test123!', gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Admin User"}',
            now(), now(), '', '', '', ''
        );

        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
        VALUES ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
                '{"sub": "e0000000-0000-0000-0000-000000000001", "email": "admin@test.com"}',
                'email', 'e0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW());

        RAISE NOTICE 'Created admin user: admin@test.com / Test123!';
    END IF;

    -- Ensure profile exists
    INSERT INTO profiles (user_id, role, zone_id, location_id, full_name)
    VALUES ('e0000000-0000-0000-0000-000000000001', 'admin', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Admin User')
    ON CONFLICT (user_id) DO NOTHING;
END $$;

-- ============================================
-- 3. GENERATE 5-YEAR DEMO DATA
-- ============================================

-- This will take a few minutes to run
\echo 'Starting 5-year demo data generation...'
\echo 'This may take 2-5 minutes...'

SELECT * FROM generate_five_year_demo_data();

-- ============================================
-- 4. SHOW SUMMARY
-- ============================================

\echo ''
\echo '=== DATA GENERATION COMPLETE ==='
\echo ''

SELECT * FROM demo_data_stats;

\echo ''
\echo 'Login credentials: admin@test.com / Test123!'
\echo ''
