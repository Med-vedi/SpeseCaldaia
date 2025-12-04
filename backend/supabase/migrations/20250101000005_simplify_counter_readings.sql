-- ============================================================================
-- Simplify Counter Readings Table Structure
-- ============================================================================
-- Remove previous_value, current_value, difference
-- Keep only: value and period_year
-- Differences will be calculated in the frontend

-- Step 1: Drop dependent views first
DROP VIEW IF EXISTS public.user_readings_summary CASCADE;

-- Step 2: Drop the generated difference column first (it depends on previous_value)
ALTER TABLE public.counter_readings
DROP COLUMN IF EXISTS difference;

-- Step 3: Add new value column
ALTER TABLE public.counter_readings
ADD COLUMN IF NOT EXISTS value NUMERIC(12, 2);

-- Step 4: Migrate existing data
-- For current year: use current_value as value
-- For previous year: use current_value as value (it's the end-of-year reading)
UPDATE public.counter_readings
SET value = COALESCE(current_value, previous_value)
WHERE value IS NULL;

-- Step 5: Make value NOT NULL (after migration)
ALTER TABLE public.counter_readings
ALTER COLUMN value SET NOT NULL;

-- Step 6: Drop old columns (now safe since difference column is gone)
ALTER TABLE public.counter_readings
DROP COLUMN IF EXISTS previous_value,
DROP COLUMN IF EXISTS current_value;

-- Step 7: Update unique constraint if needed (should already exist)
-- The constraint on (user_id, reading_type, period_year) should remain

-- Step 8: Add comments
COMMENT ON COLUMN public.counter_readings.value IS 'Counter reading value for the specified year';
COMMENT ON COLUMN public.counter_readings.period_year IS 'Year of the reading';

