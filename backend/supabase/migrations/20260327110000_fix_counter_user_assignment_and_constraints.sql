-- Repair wrong counters.user_id assignments and enforce integrity rules.

-- 1) Backfill resident counters by matching counter name to users.username in same org.
WITH matched AS (
  SELECT
    c.id AS counter_id,
    u.id AS user_id
  FROM public.counters c
  JOIN public.users u
    ON u.organization_id = c.organization_id
   AND lower(trim(u.username)) = lower(trim(regexp_replace(c.name, '\s*[-—]\s*Calore\s*$', '', 'i')))
  WHERE c.counter_type IN ('heat', 'water', 'electric')
)
UPDATE public.counters c
SET user_id = m.user_id,
    updated_at = NOW()
FROM matched m
WHERE c.id = m.counter_id
  AND c.user_id IS DISTINCT FROM m.user_id;

-- 2) Normalize electric_common rows to org-wide (user_id must be NULL).
UPDATE public.counters
SET user_id = NULL,
    updated_at = NOW()
WHERE counter_type = 'electric_common'
  AND user_id IS NOT NULL;

-- 3) Enforce user_id nullability by type:
--    - electric_common => user_id NULL
--    - all others      => user_id NOT NULL
ALTER TABLE public.counters
DROP CONSTRAINT IF EXISTS electric_common_no_user;

ALTER TABLE public.counters
ADD CONSTRAINT counters_user_id_by_type_ck CHECK (
  (counter_type = 'electric_common' AND user_id IS NULL) OR
  (counter_type <> 'electric_common' AND user_id IS NOT NULL)
);

-- 4) Prevent duplicate resident counters for same person/type within org.
CREATE UNIQUE INDEX IF NOT EXISTS idx_counters_unique_org_user_type_resident
ON public.counters (organization_id, user_id, counter_type)
WHERE counter_type IN ('heat', 'water', 'electric');

-- 5) Guard cross-org mismatches (user_id must belong to same organization_id).
CREATE OR REPLACE FUNCTION public.validate_counter_user_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.counter_type = 'electric_common' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = NEW.user_id
      AND u.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Invalid counter user/organization pair: user_id % not in organization %',
      NEW.user_id, NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_counter_user_org ON public.counters;
CREATE TRIGGER trg_validate_counter_user_org
BEFORE INSERT OR UPDATE ON public.counters
FOR EACH ROW
EXECUTE FUNCTION public.validate_counter_user_org();
