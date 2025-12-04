-- ============================================================================
-- Fix Organization ID - Change 'default-organization' to '0'
-- ============================================================================
-- Run this to update all users with 'default-organization' to '0'
-- This will update: vladi, dino, cristian (and any other users)

-- Update all users with 'default-organization' to '0'
UPDATE public.users
SET organization_id = '0'
WHERE organization_id = 'default-organization';

-- Also update any users with NULL organization_id to '0'
UPDATE public.users
SET organization_id = '0'
WHERE organization_id IS NULL;

-- Update specific users if needed (vladi, dino, cristian)
UPDATE public.users
SET organization_id = '0'
WHERE user_key IN ('vladi', 'dino', 'cristian')
  AND (organization_id IS NULL OR organization_id = 'default-organization');

-- Verify the update
SELECT
    id,
    email,
    user_key,
    organization_id,
    type,
    role
FROM public.users
ORDER BY organization_id, user_key;

-- Count by organization
SELECT
    organization_id,
    COUNT(*) as user_count
FROM public.users
GROUP BY organization_id
ORDER BY organization_id;

