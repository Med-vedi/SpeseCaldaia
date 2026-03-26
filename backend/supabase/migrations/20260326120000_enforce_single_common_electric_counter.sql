-- Ensure one organization-wide electric counter per organization.
-- Consolidates old electric/electric_common counters into a single electric_common keeper.

DO $$
DECLARE
  org_record RECORD;
  keeper_id UUID;
BEGIN
  FOR org_record IN
    SELECT DISTINCT organization_id
    FROM public.counters
  LOOP
    keeper_id := NULL;

    -- Prefer existing electric_common as keeper.
    SELECT id
    INTO keeper_id
    FROM public.counters
    WHERE organization_id = org_record.organization_id
      AND counter_type = 'electric_common'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Fallback to first electric counter as keeper.
    IF keeper_id IS NULL THEN
      SELECT id
      INTO keeper_id
      FROM public.counters
      WHERE organization_id = org_record.organization_id
        AND counter_type = 'electric'
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    -- If no electric-related counter exists, create the common one.
    IF keeper_id IS NULL THEN
      INSERT INTO public.counters (organization_id, user_id, counter_type, name)
      VALUES (org_record.organization_id, NULL, 'electric_common', 'Elettrico Comune')
      RETURNING id INTO keeper_id;
    ELSE
      -- Normalize keeper as organization-wide common electric counter.
      UPDATE public.counters
      SET
        counter_type = 'electric_common',
        user_id = NULL,
        name = 'Elettrico Comune',
        updated_at = NOW()
      WHERE id = keeper_id;
    END IF;

    -- Move yearly readings from duplicate electric counters to keeper where year is missing.
    INSERT INTO public.counter_values (counter_id, year, value, reading_date, notes, created_at, updated_at)
    SELECT
      keeper_id,
      cv.year,
      cv.value,
      cv.reading_date,
      cv.notes,
      cv.created_at,
      cv.updated_at
    FROM public.counter_values cv
    JOIN public.counters c ON c.id = cv.counter_id
    WHERE c.organization_id = org_record.organization_id
      AND c.counter_type IN ('electric', 'electric_common')
      AND c.id <> keeper_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.counter_values keeper_cv
        WHERE keeper_cv.counter_id = keeper_id
          AND keeper_cv.year = cv.year
      );

    -- Remove duplicate electric counters (counter_values cascade deletes).
    DELETE FROM public.counters
    WHERE organization_id = org_record.organization_id
      AND counter_type IN ('electric', 'electric_common')
      AND id <> keeper_id;
  END LOOP;
END $$;

-- Enforce at most one electric_common counter per organization moving forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_counters_unique_org_electric_common
ON public.counters (organization_id)
WHERE counter_type = 'electric_common';

