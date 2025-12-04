-- SQL script to create users via Supabase Dashboard
-- Run this in the Supabase SQL Editor after creating users in Authentication
--
-- IMPORTANT: You must first create the users in Authentication > Users
-- Then run this script to create their profiles in the public.users table
--
-- Steps:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add user" for each user
-- 3. Create users with these emails and password "111111" (6 chars minimum):
--    - vlad@spesecaldaia.test
--    - dino@spesecaldaia.test
--    - cristian@spesecaldaia.test
-- 4. Copy the UUIDs from the created users
-- 5. Replace the UUIDs below with the actual ones
-- 6. Run this script

-- ============================================================================
-- OPTION 1: If you know the user UUIDs, replace them below
-- ============================================================================

-- Vlad - admin
INSERT INTO public.users (id, email, username, user_key, role, type, full_name, is_active)
VALUES (
    'REPLACE_WITH_VLAD_UUID',  -- Get this from Authentication > Users
    'vlad@spesecaldaia.test',
    'vlad',
    'vladi',
    NULL,  -- role is NULL (not master)
    'admin',
    'Vlad',
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    user_key = EXCLUDED.user_key,
    role = EXCLUDED.role,
    type = EXCLUDED.type,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- Dino - admin, master
INSERT INTO public.users (id, email, username, user_key, role, type, full_name, is_active)
VALUES (
    'REPLACE_WITH_DINO_UUID',  -- Get this from Authentication > Users
    'dino@spesecaldaia.test',
    'dino',
    'dino',
    'master',  -- role is 'master'
    'admin',
    'Dino',
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    user_key = EXCLUDED.user_key,
    role = EXCLUDED.role,
    type = EXCLUDED.type,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- Cristian - admin
INSERT INTO public.users (id, email, username, user_key, role, type, full_name, is_active)
VALUES (
    'REPLACE_WITH_CRISTIAN_UUID',  -- Get this from Authentication > Users
    'cristian@spesecaldaia.test',
    'cristian',
    'cristian',
    NULL,  -- role is NULL (not master)
    'admin',
    'Cristian',
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    user_key = EXCLUDED.user_key,
    role = EXCLUDED.role,
    type = EXCLUDED.type,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- OPTION 2: Auto-create from auth.users (if users already exist)
-- ============================================================================
-- This will create profiles for users that exist in auth.users but not in public.users

INSERT INTO public.users (id, email, username, user_key, role, type, full_name, is_active)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) as username,
    CASE
        WHEN au.email = 'vlad@spesecaldaia.test' THEN 'vladi'
        WHEN au.email = 'dino@spesecaldaia.test' THEN 'dino'
        WHEN au.email = 'cristian@spesecaldaia.test' THEN 'cristian'
        ELSE LOWER(SPLIT_PART(au.email, '@', 1))
    END as user_key,
    CASE
        WHEN au.email = 'dino@spesecaldaia.test' THEN 'master'
        ELSE NULL
    END as role,
    'admin' as type,
    CASE
        WHEN au.email = 'vlad@spesecaldaia.test' THEN 'Vlad'
        WHEN au.email = 'dino@spesecaldaia.test' THEN 'Dino'
        WHEN au.email = 'cristian@spesecaldaia.test' THEN 'Cristian'
        ELSE INITCAP(SPLIT_PART(au.email, '@', 1))
    END as full_name,
    true as is_active
FROM auth.users au
WHERE au.email IN ('vlad@spesecaldaia.test', 'dino@spesecaldaia.test', 'cristian@spesecaldaia.test')
    AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = au.id
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    user_key = EXCLUDED.user_key,
    role = EXCLUDED.role,
    type = EXCLUDED.type,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- Verify the users were created
-- ============================================================================
SELECT
    id,
    email,
    username,
    user_key,
    role,
    type,
    full_name,
    is_active,
    created_at
FROM public.users
WHERE email IN ('vlad@spesecaldaia.test', 'dino@spesecaldaia.test', 'cristian@spesecaldaia.test')
ORDER BY user_key;

