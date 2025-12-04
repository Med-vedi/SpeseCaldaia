-- ============================================================================
-- Backend Database Functions
-- ============================================================================
-- These functions encapsulate business logic and organization filtering
-- Frontend should call these functions instead of querying tables directly

-- ============================================================================
-- Function: Get Counter Readings for Organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_counter_readings_for_organization(
  p_organization_id TEXT,
  p_years INTEGER[]
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  reading_type TEXT,
  period_year INTEGER,
  period_label TEXT,
  value NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.user_id,
    cr.reading_type,
    cr.period_year,
    cr.period_label,
    cr.value,
    cr.notes,
    cr.created_at,
    cr.updated_at
  FROM public.counter_readings cr
  INNER JOIN public.users u ON cr.user_id = u.id
  WHERE u.organization_id = p_organization_id
    AND u.is_active = true
    AND cr.period_year = ANY(p_years)
  ORDER BY cr.period_year DESC, cr.reading_type;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_counter_readings_for_organization(TEXT, INTEGER[]) TO authenticated;

-- ============================================================================
-- Function: Get Active Prices for Organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_prices_for_organization(
  p_organization_id TEXT
)
RETURNS TABLE (
  id UUID,
  price_type TEXT,
  value NUMERIC,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.price_type)
    p.id,
    p.price_type,
    p.value,
    p.effective_from,
    p.effective_to,
    p.is_active,
    p.created_by,
    p.updated_by,
    p.created_at,
    p.updated_at
  FROM public.prices p
  INNER JOIN public.users u ON p.created_by = u.id
  WHERE u.organization_id = p_organization_id
    AND u.is_active = true
    AND p.is_active = true
  ORDER BY p.price_type, p.effective_from DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_prices_for_organization(TEXT) TO authenticated;

-- ============================================================================
-- Function: Get Expenses for Organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_expenses_for_organization(
  p_organization_id TEXT,
  p_period_year INTEGER
)
RETURNS TABLE (
  id UUID,
  expense_type TEXT,
  value NUMERIC,
  period_year INTEGER,
  period_month INTEGER,
  description TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.expense_type,
    e.value,
    e.period_year,
    e.period_month,
    e.description,
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at
  FROM public.expenses e
  INNER JOIN public.users u ON e.created_by = u.id
  WHERE u.organization_id = p_organization_id
    AND u.is_active = true
    AND e.period_year = p_period_year
  ORDER BY e.expense_type;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_expenses_for_organization(TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- Function: Get Users for Organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_users_for_organization(
  p_organization_id TEXT
)
RETURNS TABLE (
  id UUID,
  user_key TEXT,
  full_name TEXT,
  username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_key,
    u.full_name,
    u.username
  FROM public.users u
  WHERE u.organization_id = p_organization_id
    AND u.is_active = true
  ORDER BY u.user_key;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_for_organization(TEXT) TO authenticated;

-- ============================================================================
-- Function: Get Users by IDs (with organization check)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_users_by_ids(
  p_user_ids UUID[],
  p_organization_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_key TEXT,
  full_name TEXT,
  username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.user_key,
    u.full_name,
    u.username
  FROM public.users u
  WHERE u.id = ANY(p_user_ids)
    AND u.is_active = true
    AND (p_organization_id IS NULL OR u.organization_id = p_organization_id)
  ORDER BY u.user_key;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_by_ids(UUID[], TEXT) TO authenticated;

-- ============================================================================
-- Function: Get User Profile by ID
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_profile_by_id(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  user_key TEXT,
  organization_id TEXT,
  role TEXT,
  type TEXT,
  full_name TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.username,
    u.user_key,
    u.organization_id,
    u.role,
    u.type,
    u.full_name,
    u.is_active
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_id(UUID) TO authenticated;

-- ============================================================================
-- Function: Get User by User Key (for organization)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_by_key(
  p_user_key TEXT,
  p_organization_id TEXT
)
RETURNS TABLE (
  id UUID,
  organization_id TEXT,
  user_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.organization_id,
    u.user_key
  FROM public.users u
  WHERE u.user_key = p_user_key
    AND u.organization_id = p_organization_id
    AND u.is_active = true
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_by_key(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Function: Get Counter Reading by User, Type, and Year
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_counter_reading(
  p_user_id UUID,
  p_reading_type TEXT,
  p_period_year INTEGER
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  reading_type TEXT,
  period_year INTEGER,
  period_label TEXT,
  value NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.user_id,
    cr.reading_type,
    cr.period_year,
    cr.period_label,
    cr.value,
    cr.notes,
    cr.created_at,
    cr.updated_at
  FROM public.counter_readings cr
  WHERE cr.user_id = p_user_id
    AND cr.reading_type = p_reading_type
    AND cr.period_year = p_period_year
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_counter_reading(UUID, TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- Function: Upsert Counter Reading
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_counter_reading(
  p_user_id UUID,
  p_reading_type TEXT,
  p_period_year INTEGER,
  p_value NUMERIC,
  p_period_label TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  reading_type TEXT,
  period_year INTEGER,
  period_label TEXT,
  value NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  INSERT INTO public.counter_readings (
    user_id,
    reading_type,
    period_year,
    period_label,
    value,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    p_user_id,
    p_reading_type,
    p_period_year,
    COALESCE(p_period_label, p_period_year::TEXT),
    p_value,
    p_notes,
    p_created_by,
    p_updated_by
  )
  ON CONFLICT (user_id, reading_type, period_year)
  DO UPDATE SET
    value = EXCLUDED.value,
    period_label = COALESCE(EXCLUDED.period_label, counter_readings.period_label),
    notes = COALESCE(EXCLUDED.notes, counter_readings.notes),
    updated_by = COALESCE(EXCLUDED.updated_by, counter_readings.updated_by),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN QUERY SELECT * FROM public.counter_readings WHERE id = v_result.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_counter_reading(UUID, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, UUID, UUID) TO authenticated;

-- ============================================================================
-- Function: Create Price (deactivates old ones)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_price(
  p_price_type TEXT,
  p_value NUMERIC,
  p_effective_from TIMESTAMPTZ DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  price_type TEXT,
  value NUMERIC,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_effective_from TIMESTAMPTZ := COALESCE(p_effective_from, NOW());
BEGIN
  -- Deactivate old prices of the same type
  UPDATE public.prices
  SET is_active = false,
      effective_to = v_effective_from,
      updated_at = NOW()
  WHERE price_type = p_price_type
    AND is_active = true;

  -- Insert new price
  RETURN QUERY
  INSERT INTO public.prices (
    price_type,
    value,
    effective_from,
    is_active,
    created_by,
    updated_by
  )
  VALUES (
    p_price_type,
    p_value,
    v_effective_from,
    true,
    p_created_by,
    p_updated_by
  )
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_price(TEXT, NUMERIC, TIMESTAMPTZ, UUID, UUID) TO authenticated;

-- ============================================================================
-- Function: Upsert Expense
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_expense(
  p_expense_type TEXT,
  p_value NUMERIC,
  p_period_year INTEGER,
  p_period_month INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  expense_type TEXT,
  value NUMERIC,
  period_year INTEGER,
  period_month INTEGER,
  description TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_month INTEGER := COALESCE(p_period_month, EXTRACT(MONTH FROM NOW())::INTEGER);
  v_existing_id UUID;
BEGIN
  -- Try to find existing expense
  SELECT id INTO v_existing_id
  FROM public.expenses
  WHERE expense_type = p_expense_type
    AND period_year = p_period_year
    AND period_month = v_period_month
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.expenses
    SET value = p_value,
        description = COALESCE(p_description, description),
        updated_by = COALESCE(p_updated_by, updated_by),
        updated_at = NOW()
    WHERE id = v_existing_id;

    RETURN QUERY SELECT * FROM public.expenses WHERE id = v_existing_id;
  ELSE
    -- Insert new
    RETURN QUERY
    INSERT INTO public.expenses (
      expense_type,
      value,
      period_year,
      period_month,
      description,
      created_by,
      updated_by
    )
    VALUES (
      p_expense_type,
      p_value,
      p_period_year,
      v_period_month,
      p_description,
      p_created_by,
      p_updated_by
    )
    RETURNING *;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_expense(TEXT, NUMERIC, INTEGER, INTEGER, TEXT, UUID, UUID) TO authenticated;

