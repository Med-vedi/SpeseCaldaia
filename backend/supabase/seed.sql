-- Seed data for SpeseCaldaia application
-- This file seeds initial data after migrations
--
-- NOTE: For complete data seeding, use seed-initial-data.sql after creating users
-- This file contains basic defaults that can be used during development

-- ============================================================================
-- SEED USERS
-- ============================================================================
-- Note: In production, users should be created through Supabase Auth API
-- This seed file assumes users have already been created in auth.users
-- You'll need to manually create users through the auth system first
--
-- Use fix-and-create-users.sql or create users via Dashboard first

-- ============================================================================
-- SEED DEFAULT PRICES
-- ============================================================================
-- Insert default prices (these match the frontend defaults)
INSERT INTO public.prices (price_type, value, effective_from, is_active, notes)
VALUES
    ('gasolio', 1.28, NOW(), true, 'Default gasolio price'),
    ('acqua', 2.00, NOW(), true, 'Default acqua price'),
    ('corrente', 0.14, NOW(), true, 'Default corrente price')
ON CONFLICT (price_type, effective_from) DO NOTHING;

-- ============================================================================
-- SEED DEFAULT EXPENSES (Optional - for initial setup)
-- ============================================================================
-- Insert default expenses for current period
-- These can be updated through the application
INSERT INTO public.expenses (expense_type, value, period_year, period_month, is_paid, description)
VALUES
    ('fatturaGasolio', 1280.00, 2025, 1, false, 'Initial gasolio invoice'),
    ('manutenzione', 120.00, 2025, 1, false, 'Maintenance cost'),
    ('prezzoGasolio', 1.28, 2025, 1, false, 'Gasolio price per liter')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- For complete data seeding:
-- 1. Create users first (use fix-and-create-users.sql or Dashboard)
-- 2. Run seed-initial-data.sql to seed counter readings, prices, and expenses
--
-- Multi-organization support:
-- - All users are assigned to 'default-organization' initially
-- - In the future, create an organizations table and link users to it
-- - Filter data by organization_id when querying
--
-- See SEED_DATA_GUIDE.md for detailed instructions
