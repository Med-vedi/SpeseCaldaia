-- ============================================================================
-- Check Counter Readings Data
-- ============================================================================
-- Run this in Supabase SQL Editor to view counter_readings data

-- View all counter readings
SELECT
    cr.id,
    cr.user_id,
    u.user_key,
    u.full_name,
    u.username,
    cr.reading_type,
    cr.period_year,
    cr.previous_value,
    cr.current_value,
    cr.difference,
    cr.period_label,
    cr.notes,
    cr.created_at,
    cr.updated_at
FROM public.counter_readings cr
LEFT JOIN public.users u ON cr.user_id = u.id
ORDER BY cr.period_year DESC, cr.reading_type, u.user_key;

-- Count readings by type and year
SELECT
    reading_type,
    period_year,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM public.counter_readings
GROUP BY reading_type, period_year
ORDER BY period_year DESC, reading_type;

-- View readings for current year (2025) and previous year (2024)
SELECT
    cr.reading_type,
    cr.period_year,
    u.user_key,
    u.full_name,
    cr.previous_value,
    cr.current_value,
    cr.difference
FROM public.counter_readings cr
LEFT JOIN public.users u ON cr.user_id = u.id
WHERE cr.period_year IN (2024, 2025)
ORDER BY cr.period_year DESC, cr.reading_type, u.user_key;

-- Check if readings exist for main users
SELECT
    u.user_key,
    u.full_name,
    cr.reading_type,
    cr.period_year,
    cr.previous_value,
    cr.current_value
FROM public.users u
LEFT JOIN public.counter_readings cr ON u.id = cr.user_id AND cr.period_year IN (2024, 2025)
WHERE u.user_key IN ('vladi', 'dino', 'cristian')
ORDER BY u.user_key, cr.reading_type, cr.period_year DESC;

