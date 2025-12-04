-- Seed initial data for SpeseCaldaia
-- This script seeds:
-- 1. Organization (for future multi-organization support)
-- 2. Counter readings (kCal, m3, kW) for 2024 and 2025
-- 3. Prices (gasolio, acqua, corrente)
-- 4. Expenses (fatturaGasolio, manutenzione, etc.)
--
-- PREREQUISITES:
-- 1. ✅ Database migrations must be applied first!
--    Run: supabase db reset (local) or apply migrations (production)
-- 2. ✅ Users must be created (use scripts/setup/fix-and-create-users.sql)
--
-- Run this in Supabase SQL Editor after migrations and users are created

-- ============================================================================
-- Check if tables exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'counter_readings'
    ) THEN
        RAISE EXCEPTION 'Table counter_readings does not exist. Please run migrations first: supabase db reset (local) or apply migrations (production)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'prices'
    ) THEN
        RAISE EXCEPTION 'Table prices does not exist. Please run migrations first.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'expenses'
    ) THEN
        RAISE EXCEPTION 'Table expenses does not exist. Please run migrations first.';
    END IF;
END $$;

-- ============================================================================
-- Step 1: Set organization_id for existing users
-- ============================================================================
-- For now, we'll use a default organization ID
-- In the future, you can create an organizations table and link users to it

DO $$
DECLARE
    default_org_id TEXT := '0';
BEGIN
    -- Update all users to have the default organization_id
    UPDATE public.users
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    RAISE NOTICE 'Set organization_id to % for users without organization', default_org_id;
END $$;

-- ============================================================================
-- Step 2: Get user IDs for reference
-- ============================================================================
-- We'll use these in the inserts below

-- ============================================================================
-- Step 3: Insert Counter Readings
-- ============================================================================
-- Period: Current year (2025)
-- Note: kW readings are "comune" (shared), so we'll store them with the master user (dino)
-- previous_value = 2024 readings, current_value = 2025 readings

DO $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
    -- kCal Readings for current year
    INSERT INTO public.counter_readings (user_id, reading_type, period_year, period_label, previous_value, current_value, notes)
    SELECT
        u.id,
        'kcal',
        current_year,
        current_year::TEXT,
    CASE
        WHEN u.user_key = 'vladi' THEN 124637.7
        WHEN u.user_key = 'dino' THEN 80818.7
        WHEN u.user_key = 'cristian' THEN 86479
        ELSE NULL
    END,
    CASE
        WHEN u.user_key = 'vladi' THEN 125769.7
        WHEN u.user_key = 'dino' THEN 82048.3
        WHEN u.user_key = 'cristian' THEN 86479
        ELSE NULL
    END,
    'Initial seed data - ' || current_year::TEXT || ' period'
FROM public.users u
WHERE u.user_key IN ('vladi', 'dino', 'cristian')
    AND u.organization_id = '0'
ON CONFLICT (user_id, reading_type, period_year) DO UPDATE SET
    previous_value = EXCLUDED.previous_value,
    current_value = EXCLUDED.current_value,
    notes = EXCLUDED.notes,
    updated_at = NOW();

    -- m3 Readings for current year
    INSERT INTO public.counter_readings (user_id, reading_type, period_year, period_label, previous_value, current_value, notes)
    SELECT
        u.id,
        'm3',
        current_year,
        current_year::TEXT,
    CASE
        WHEN u.user_key = 'vladi' THEN 390
        WHEN u.user_key = 'dino' THEN 782
        WHEN u.user_key = 'cristian' THEN 342
        ELSE NULL
    END,
    CASE
        WHEN u.user_key = 'vladi' THEN 422
        WHEN u.user_key = 'dino' THEN 830
        WHEN u.user_key = 'cristian' THEN 359
        ELSE NULL
    END,
    'Initial seed data - ' || current_year::TEXT || ' period'
FROM public.users u
WHERE u.user_key IN ('vladi', 'dino', 'cristian')
    AND u.organization_id = '0'
ON CONFLICT (user_id, reading_type, period_year) DO UPDATE SET
    previous_value = EXCLUDED.previous_value,
    current_value = EXCLUDED.current_value,
    notes = EXCLUDED.notes,
    updated_at = NOW();

    -- kW Readings for current year - stored with master user (dino) as "comune" (shared)
    INSERT INTO public.counter_readings (user_id, reading_type, period_year, period_label, previous_value, current_value, notes)
    SELECT
        u.id,
        'kw',
        current_year,
        current_year::TEXT,
        2861,
        3192.3,
        'Initial seed data - ' || current_year::TEXT || ' period - Comune (shared)'
    FROM public.users u
    WHERE u.user_key = 'dino'
        AND u.organization_id = '0'
    ON CONFLICT (user_id, reading_type, period_year) DO UPDATE SET
        previous_value = EXCLUDED.previous_value,
        current_value = EXCLUDED.current_value,
        notes = EXCLUDED.notes,
        updated_at = NOW();
END $$;

-- ============================================================================
-- Step 4: Insert Prices
-- ============================================================================
-- Current active prices

INSERT INTO public.prices (price_type, value, effective_from, is_active, notes)
VALUES
    ('gasolio', 1.28, NOW(), true, 'Initial seed data - Gasolio price'),
    ('acqua', 2.00, NOW(), true, 'Initial seed data - Acqua price'),
    ('corrente', 0.14, NOW(), true, 'Initial seed data - Corrente price')
ON CONFLICT (price_type, effective_from) DO NOTHING;

-- ============================================================================
-- Step 5: Insert Expenses
-- ============================================================================
-- Current period expenses (current year)

DO $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
    current_month INTEGER := EXTRACT(MONTH FROM NOW());
BEGIN
    INSERT INTO public.expenses (expense_type, value, period_year, period_month, is_paid, description)
    VALUES
        ('fatturaGasolio', 1280.00, current_year, current_month, false, 'Initial seed data - Fattura Gasolio'),
        ('manutenzione', 120.00, current_year, current_month, false, 'Initial seed data - Manutenzione'),
        ('prezzoGasolio', 1.28, current_year, current_month, false, 'Initial seed data - Prezzo Gasolio per litro'),
        ('corrente', 46.40, current_year, current_month, false, 'Initial seed data - Corrente (calculated: 331.3 kW * 0.14)')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- Step 6: Verify Data
-- ============================================================================

-- Verify counter readings
SELECT
    u.user_key,
    u.full_name,
    cr.reading_type,
    cr.period_year,
    cr.previous_value,
    cr.current_value,
    cr.difference
FROM public.counter_readings cr
JOIN public.users u ON cr.user_id = u.id
WHERE u.organization_id = '0'
ORDER BY u.user_key, cr.reading_type, cr.period_year;

-- Verify prices
SELECT
    price_type,
    value,
    effective_from,
    is_active
FROM public.prices
WHERE is_active = true
ORDER BY price_type;

-- Verify expenses
SELECT
    expense_type,
    value,
    period_year,
    period_month,
    description
FROM public.expenses
WHERE period_year = EXTRACT(YEAR FROM NOW())
ORDER BY expense_type;

-- Summary
SELECT
    'Counter Readings' as data_type,
    COUNT(*) as count
FROM public.counter_readings
UNION ALL
SELECT
    'Active Prices' as data_type,
    COUNT(*) as count
FROM public.prices
WHERE is_active = true
UNION ALL
SELECT
    'Expenses (Current Year)' as data_type,
    COUNT(*) as count
FROM public.expenses
WHERE period_year = EXTRACT(YEAR FROM NOW());

