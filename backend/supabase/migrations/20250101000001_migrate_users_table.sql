-- Migration to update users table from old schema to new schema
-- This handles the transition from the old users table structure to the new one

-- Check if old columns exist and migrate data
DO $$
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'email') THEN
        ALTER TABLE public.users ADD COLUMN email TEXT;
        -- Try to get email from auth.users
        UPDATE public.users u
        SET email = au.email
        FROM auth.users au
        WHERE u.id = au.id;
        ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'user_key') THEN
        -- Generate user_key from username if it doesn't exist
        ALTER TABLE public.users ADD COLUMN user_key TEXT;
        UPDATE public.users SET user_key = LOWER(username) WHERE user_key IS NULL;
        ALTER TABLE public.users ALTER COLUMN user_key SET NOT NULL;
        -- Add unique constraint
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_key_unique ON public.users(user_key);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'full_name') THEN
        ALTER TABLE public.users ADD COLUMN full_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Update role constraint if old constraint exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_schema = 'public'
               AND table_name = 'users'
               AND constraint_name = 'users_role_check') THEN
        -- Drop old constraint
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
        -- Add new constraint
        ALTER TABLE public.users ADD CONSTRAINT users_role_check
            CHECK (role IN ('master') OR role IS NULL);
    END IF;

    -- Update type column if it exists with old values
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public'
               AND table_name = 'users'
               AND column_name = 'role') THEN
        -- Map old role values to new type values
        -- If role was 'admin', set type to 'admin' and role to 'master' or NULL
        -- If role was 'basic', set type to 'user' and role to NULL
        -- If role was 'guest', set type to 'guest' and role to NULL
        UPDATE public.users
        SET type = CASE
            WHEN role = 'admin' THEN 'admin'
            WHEN role = 'basic' THEN 'user'
            WHEN role = 'guest' THEN 'guest'
            ELSE 'user'
        END
        WHERE type IS NULL OR type NOT IN ('admin', 'user', 'guest');
    END IF;

    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'users'
                   AND column_name = 'type') THEN
        ALTER TABLE public.users ADD COLUMN type TEXT;
        -- Set default type based on role
        UPDATE public.users SET type = 'user' WHERE type IS NULL;
        ALTER TABLE public.users ALTER COLUMN type SET NOT NULL;
        ALTER TABLE public.users ADD CONSTRAINT users_type_check
            CHECK (type IN ('admin', 'user', 'guest'));
    END IF;

    -- Keep organization_id but make it nullable if it has NOT NULL constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'organization_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN organization_id DROP NOT NULL;
        RAISE NOTICE 'Made organization_id nullable';
    END IF;

END $$;

-- Make role nullable first
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- Ensure all constraints are in place
ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_role_check,
    ADD CONSTRAINT users_role_check CHECK (role IN ('master') OR role IS NULL);

ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_type_check,
    ADD CONSTRAINT users_type_check CHECK (type IN ('admin', 'user', 'guest'));

-- Update indexes
DROP INDEX IF EXISTS public.idx_users_user_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_key ON public.users(user_key);

DROP INDEX IF EXISTS public.idx_users_type;
CREATE INDEX IF NOT EXISTS idx_users_type ON public.users(type);

DROP INDEX IF EXISTS public.idx_users_role;
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role) WHERE role IS NOT NULL;

-- Ensure updated_at has NOT NULL constraint
ALTER TABLE public.users ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN created_at SET NOT NULL;

