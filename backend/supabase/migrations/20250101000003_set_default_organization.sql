-- ============================================================================
-- Set Default Organization ID to '0'
-- ============================================================================
-- This migration sets all users without organization_id to '0'
-- All data (counter_readings, prices, expenses) are linked through users,
-- so setting organization_id on users ensures proper data isolation
--
-- IMPORTANT: All data is chained to organization_id through:
-- - counter_readings.user_id -> users.id -> users.organization_id
-- - prices.created_by -> users.id -> users.organization_id
-- - expenses.created_by -> users.id -> users.organization_id
--
-- This allows multiple organizations with their own users, counters, expenses, etc.

-- Set default organization_id to '0' for users without one
-- Also update any users with 'default-organization' to '0'
UPDATE public.users
SET organization_id = '0'
WHERE organization_id IS NULL
   OR organization_id = 'default-organization';

-- Verify the update
SELECT
    organization_id,
    COUNT(*) as user_count
FROM public.users
GROUP BY organization_id
ORDER BY organization_id;

-- Note:
-- - counter_readings are linked through user_id -> users.organization_id
-- - prices are linked through created_by -> users.organization_id
-- - expenses are linked through created_by -> users.organization_id
--
-- All queries should filter by organization_id through these relationships

