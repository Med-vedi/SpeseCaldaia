-- ============================================================================
-- Check User Profile Data
-- ============================================================================
-- Run this in Supabase SQL Editor to verify user profiles exist and match auth users

-- Check all users in public.users table
SELECT
    id,
    email,
    username,
    user_key,
    organization_id,
    type,
    role,
    full_name,
    is_active,
    created_at
FROM public.users
ORDER BY user_key;

-- Check auth users (if you have access)
-- Note: This might not work in SQL Editor, but you can check in Auth > Users in Supabase Dashboard
-- SELECT id, email, created_at FROM auth.users;

-- Check if a specific user exists (replace with actual user ID from console)
-- SELECT * FROM public.users WHERE id = 'ac84f141-169e-4d07-8f3d-f1e784d7e046';

-- Check users by email
SELECT
    id,
    email,
    username,
    user_key,
    organization_id,
    type,
    role
FROM public.users
WHERE email LIKE '%medvedivladislav%' OR email LIKE '%vlad%'
ORDER BY email;

-- Verify organization_id is set correctly
SELECT
    user_key,
    email,
    organization_id,
    CASE
        WHEN organization_id = '0' THEN '✅ Correct'
        WHEN organization_id IS NULL THEN '❌ NULL'
        ELSE '⚠️ Other: ' || organization_id
    END as status
FROM public.users
ORDER BY user_key;

