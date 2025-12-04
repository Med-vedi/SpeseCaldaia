-- Direct SQL script to create users in Supabase Dashboard
-- This bypasses email validation by creating users directly in auth.users
-- Run this in Supabase Dashboard > SQL Editor
--
-- IMPORTANT: This requires direct database access (service role or database admin)
-- If you get permission errors, you'll need to use the Supabase Dashboard UI instead

-- ============================================================================
-- Step 1: Create users in auth.users table
-- ============================================================================
-- Note: You'll need to generate UUIDs for each user
-- You can use: SELECT gen_random_uuid();

-- Generate UUIDs for the users
DO $$
DECLARE
    vlad_uuid UUID := gen_random_uuid();
    dino_uuid UUID := gen_random_uuid();
    cristian_uuid UUID := gen_random_uuid();
BEGIN
    -- Insert Vlad
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        vlad_uuid,
        'authenticated',
        'authenticated',
        'vlad@example.com',
        crypt('111111', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"username": "vlad", "user_key": "vladi", "full_name": "Vlad"}',
        false,
        '',
        '',
        '',
        ''
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert Dino
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        dino_uuid,
        'authenticated',
        'authenticated',
        'dino@example.com',
        crypt('111111', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"username": "dino", "user_key": "dino", "full_name": "Dino"}',
        false,
        '',
        '',
        '',
        ''
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert Cristian
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        cristian_uuid,
        'authenticated',
        'authenticated',
        'cristian@example.com',
        crypt('111111', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"username": "cristian", "user_key": "cristian", "full_name": "Cristian"}',
        false,
        '',
        '',
        '',
        ''
    )
    ON CONFLICT (id) DO NOTHING;

    -- Step 2: Create profiles in public.users
    INSERT INTO public.users (id, email, username, user_key, role, type, full_name, is_active)
    VALUES
        (vlad_uuid, 'vlad@example.com', 'vlad', 'vladi', NULL, 'admin', 'Vlad', true),
        (dino_uuid, 'dino@example.com', 'dino', 'dino', 'master', 'admin', 'Dino', true),
        (cristian_uuid, 'cristian@example.com', 'cristian', 'cristian', NULL, 'admin', 'Cristian', true)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        user_key = EXCLUDED.user_key,
        role = EXCLUDED.role,
        type = EXCLUDED.type,
        full_name = EXCLUDED.full_name,
        is_active = EXCLUDED.is_active;

    RAISE NOTICE 'Users created successfully!';
    RAISE NOTICE 'Vlad UUID: %', vlad_uuid;
    RAISE NOTICE 'Dino UUID: %', dino_uuid;
    RAISE NOTICE 'Cristian UUID: %', cristian_uuid;
END $$;

-- ============================================================================
-- Verify users were created
-- ============================================================================
SELECT
    u.id,
    u.email,
    u.username,
    u.user_key,
    u.role,
    u.type,
    u.full_name,
    u.is_active,
    au.email_confirmed_at IS NOT NULL as email_confirmed
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email IN ('vlad@example.com', 'dino@example.com', 'cristian@example.com')
ORDER BY u.user_key;

