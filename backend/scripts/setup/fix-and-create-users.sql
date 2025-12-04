-- Fix users table structure and create user profiles
-- This script will:
-- 1. Fix constraints (make role and organization_id nullable)
-- 2. Add missing columns to users table if they don't exist
-- 3. Create user profiles for existing auth users

-- ============================================================================
-- Step 0: Fix existing constraints first (CRITICAL - must run before inserts)
-- ============================================================================

-- Make role nullable (old migration has it as NOT NULL)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;
        RAISE NOTICE 'Made role column nullable';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Role column already nullable or error: %', SQLERRM;
    END;
END $$;

-- Make organization_id nullable (old migration has it as NOT NULL)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.users ALTER COLUMN organization_id DROP NOT NULL;
        RAISE NOTICE 'Made organization_id column nullable';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'organization_id column already nullable or error: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- Step 1: Add missing columns to users table
-- ============================================================================

-- Add email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.users ADD COLUMN email TEXT;
        -- Populate email from auth.users
        UPDATE public.users u
        SET email = au.email
        FROM auth.users au
        WHERE u.id = au.id;
        -- Make it NOT NULL after populating
        ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
        RAISE NOTICE 'Added email column to users table';
    END IF;
END $$;

-- Add user_key column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'user_key'
    ) THEN
        ALTER TABLE public.users ADD COLUMN user_key TEXT;
        -- Generate user_key from username
        UPDATE public.users SET user_key = LOWER(username) WHERE user_key IS NULL;
        ALTER TABLE public.users ALTER COLUMN user_key SET NOT NULL;
        -- Add unique constraint
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_key_unique ON public.users(user_key);
        RAISE NOTICE 'Added user_key column to users table';
    END IF;
END $$;

-- Add type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.users ADD COLUMN type TEXT;
        UPDATE public.users SET type = 'admin' WHERE type IS NULL;
        ALTER TABLE public.users ALTER COLUMN type SET NOT NULL;
        ALTER TABLE public.users ADD CONSTRAINT users_type_check
            CHECK (type IN ('admin', 'user', 'guest'));
        RAISE NOTICE 'Added type column to users table';
    END IF;
END $$;

-- Add full_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to users table';
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
        UPDATE public.users SET is_active = true WHERE is_active IS NULL;
        RAISE NOTICE 'Added is_active column to users table';
    END IF;
END $$;

-- Add organization_id column if it doesn't exist (make it nullable)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN organization_id TEXT;
        RAISE NOTICE 'Added organization_id column to users table';
    END IF;
END $$;

-- If organization_id has NOT NULL constraint, make it nullable
DO $$
BEGIN
    -- Check if constraint exists and remove it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
        AND table_name = 'users'
        AND constraint_name = 'users_organization_id_not_null'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_organization_id_not_null;
    END IF;

    -- Also check for check constraints
    ALTER TABLE public.users ALTER COLUMN organization_id DROP NOT NULL;
    RAISE NOTICE 'Made organization_id nullable';
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be nullable, ignore error
        NULL;
END $$;

-- Update role constraint and make it nullable
DO $$
BEGIN
    -- First, make role nullable if it has NOT NULL constraint
    BEGIN
        ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;
        RAISE NOTICE 'Made role column nullable';
    EXCEPTION
        WHEN OTHERS THEN
            -- Column might already be nullable, ignore error
            NULL;
    END;

    -- Drop old constraint if it exists
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

    -- Add new constraint (allows 'master' or NULL)
    ALTER TABLE public.users ADD CONSTRAINT users_role_check
        CHECK (role IN ('master') OR role IS NULL);
    RAISE NOTICE 'Updated role constraint';
END $$;

-- ============================================================================
-- Step 2: Create/Update user profiles
-- ============================================================================

INSERT INTO public.users (id, email, username, user_key, organization_id, role, type, full_name, is_active)
SELECT
    au.id,
    au.email,
    CASE
        WHEN au.email = 'medvedivladislav@gmail.com' THEN 'vlad'
        WHEN au.email = 'dino@example.com' THEN 'dino'
        WHEN au.email = 'cristian@example.com' THEN 'cristian'
        ELSE LOWER(SPLIT_PART(au.email, '@', 1))
    END as username,
    CASE
        WHEN au.email = 'medvedivladislav@gmail.com' THEN 'vladi'
        WHEN au.email = 'dino@example.com' THEN 'dino'
        WHEN au.email = 'cristian@example.com' THEN 'cristian'
        ELSE LOWER(SPLIT_PART(au.email, '@', 1))
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
        ELSE INITCAP(SPLIT_PART(au.email, '@', 1))
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

-- ============================================================================
-- Step 3: Verify the users were created
-- ============================================================================
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

