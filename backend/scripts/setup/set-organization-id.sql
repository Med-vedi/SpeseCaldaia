-- ============================================================================
-- Set Organization ID to '0' for All Users
-- ============================================================================
-- Run this script to set organization_id = '0' for all users without one
-- This ensures all data is properly chained to organization_id
--
-- IMPORTANT: All data is chained to organization_id through:
-- - counter_readings.user_id -> users.id -> users.organization_id
-- - prices.created_by -> users.id -> users.organization_id
-- - expenses.created_by -> users.id -> users.organization_id
--
-- This allows multiple organizations with their own:
-- - Users
-- - Counter readings
-- - Prices
-- - Expenses
-- - All other data

-- Set organization_id to '0' for all users without one
UPDATE public.users
SET organization_id = '0'
WHERE organization_id IS NULL;

-- Verify the update
SELECT
    organization_id,
    COUNT(*) as user_count,
    STRING_AGG(user_key, ', ') as users
FROM public.users
GROUP BY organization_id
ORDER BY organization_id;

-- Show all users with their organization_id
SELECT
    id,
    user_key,
    full_name,
    organization_id,
    type,
    role,
    is_active
FROM public.users
ORDER BY organization_id, user_key;

