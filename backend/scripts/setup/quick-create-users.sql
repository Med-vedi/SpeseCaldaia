-- Quick SQL to create user profiles after creating users in Authentication UI
--
-- INSTRUCTIONS:
-- 1. First, create users in Dashboard > Authentication > Users with:
--    - medvedivladislav@gmail.com / 111111
--    - dino@example.com / 111111
--    - cristian@example.com / 111111
--    (Make sure to check "Auto Confirm User")
--
-- 2. Then run this SQL in SQL Editor:
--
-- NOTE: If you get "column email does not exist" error, run fix-and-create-users.sql instead

-- First, check if email column exists and add it if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.users ADD COLUMN email TEXT;
        UPDATE public.users u SET email = au.email FROM auth.users au WHERE u.id = au.id;
        ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'user_key'
    ) THEN
        ALTER TABLE public.users ADD COLUMN user_key TEXT;
        UPDATE public.users SET user_key = LOWER(username) WHERE user_key IS NULL;
        ALTER TABLE public.users ALTER COLUMN user_key SET NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.users ADD COLUMN type TEXT;
        UPDATE public.users SET type = 'admin' WHERE type IS NULL;
        ALTER TABLE public.users ALTER COLUMN type SET NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN full_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN organization_id TEXT;
    END IF;

    -- Make organization_id nullable if it has NOT NULL constraint
    BEGIN
        ALTER TABLE public.users ALTER COLUMN organization_id DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
END $$;

INSERT INTO public.users (id, email, username, user_key, organization_id, role, type, full_name, is_active)
SELECT
    au.id,
    au.email,
    CASE
        WHEN au.email = 'medvedivladislav@gmail.com' THEN 'vlad'
        WHEN au.email = 'dino@example.com' THEN 'dino'
        WHEN au.email = 'cristian@example.com' THEN 'cristian'
    END as username,
    CASE
        WHEN au.email = 'medvedivladislav@gmail.com' THEN 'vladi'
        WHEN au.email = 'dino@example.com' THEN 'dino'
        WHEN au.email = 'cristian@example.com' THEN 'cristian'
    END as user_key,
    NULL as organization_id, -- Can be set later when organizations are implemented
    CASE
        WHEN au.email = 'dino@example.com' THEN 'master'
        ELSE NULL
    END as role,
    'admin' as type,
    CASE
        WHEN au.email = 'medvedivladislav@gmail.com' THEN 'Vlad'
        WHEN au.email = 'dino@example.com' THEN 'Dino'
        WHEN au.email = 'cristian@example.com' THEN 'Cristian'
    END as full_name,
    true as is_active
FROM auth.users au
WHERE au.email IN ('medvedivladislav@gmail.com', 'dino@example.com', 'cristian@example.com')
    AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = au.id
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    user_key = EXCLUDED.user_key,
    organization_id = COALESCE(EXCLUDED.organization_id, public.users.organization_id),
    role = EXCLUDED.role,
    type = EXCLUDED.type,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- Verify the users were created
SELECT
    email,
    username,
    user_key,
    role,
    type,
    full_name,
    is_active
FROM public.users
WHERE email IN ('medvedivladislav@gmail.com', 'dino@example.com', 'cristian@example.com')
ORDER BY user_key;

