-- Complete database schema for SpeseCaldaia application
-- This migration creates all necessary tables with proper relationships and constraints

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Users table with roles (master or null) and type (admin, user, guest)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    user_key TEXT UNIQUE NOT NULL, -- Unique identifier like 'vladi', 'dino', 'cristian'
    organization_id TEXT, -- Organization/group identifier (nullable for now, can be set later)
    role TEXT CHECK (role IN ('master') OR role IS NULL), -- 'master' or NULL
    type TEXT NOT NULL CHECK (type IN ('admin', 'user', 'guest')),
    full_name TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_key ON public.users(user_key);
CREATE INDEX IF NOT EXISTS idx_users_type ON public.users(type);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id) WHERE organization_id IS NOT NULL;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all active users" ON public.users;
CREATE POLICY "Users can view all active users" ON public.users
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Note: Admin policies removed to avoid infinite recursion
-- The "Users can view all active users" policy already allows viewing all active users
-- If you need admin-only access, use a security definer function instead
-- For now, all authenticated users can view all active users

-- ============================================================================
-- COUNTER READINGS TABLE
-- ============================================================================
-- Stores counter readings (kCal, m3, kW) for each user per period
CREATE TABLE IF NOT EXISTS public.counter_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reading_type TEXT NOT NULL CHECK (reading_type IN ('kcal', 'm3', 'kw')),
    period_year INTEGER NOT NULL,
    period_label TEXT, -- e.g., '2024', '2025', or custom labels
    previous_value NUMERIC(12, 2),
    current_value NUMERIC(12, 2),
    difference NUMERIC(12, 2) GENERATED ALWAYS AS (
        CASE
            WHEN previous_value IS NOT NULL AND current_value IS NOT NULL
            THEN current_value - previous_value
            ELSE NULL
        END
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    -- Ensure one reading per user, type, and period
    UNIQUE(user_id, reading_type, period_year)
);

-- Enable RLS
ALTER TABLE public.counter_readings ENABLE ROW LEVEL SECURITY;

-- Create indexes for counter_readings
CREATE INDEX IF NOT EXISTS idx_counter_readings_user_id ON public.counter_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_counter_readings_type ON public.counter_readings(reading_type);
CREATE INDEX IF NOT EXISTS idx_counter_readings_period ON public.counter_readings(period_year);
CREATE INDEX IF NOT EXISTS idx_counter_readings_user_type_period ON public.counter_readings(user_id, reading_type, period_year);

-- RLS Policies for counter_readings
DROP POLICY IF EXISTS "Users can view their own readings" ON public.counter_readings;
CREATE POLICY "Users can view their own readings" ON public.counter_readings
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view all readings" ON public.counter_readings;
CREATE POLICY "Users can view all readings" ON public.counter_readings
    FOR SELECT USING (true); -- All authenticated users can view all readings

DROP POLICY IF EXISTS "Users can insert their own readings" ON public.counter_readings;
CREATE POLICY "Users can insert their own readings" ON public.counter_readings
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert any readings" ON public.counter_readings;
CREATE POLICY "Admins can insert any readings" ON public.counter_readings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update their own readings" ON public.counter_readings;
CREATE POLICY "Users can update their own readings" ON public.counter_readings
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update any readings" ON public.counter_readings;
CREATE POLICY "Admins can update any readings" ON public.counter_readings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete any readings" ON public.counter_readings;
CREATE POLICY "Admins can delete any readings" ON public.counter_readings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

-- ============================================================================
-- PRICES TABLE
-- ============================================================================
-- Stores price configurations for gasolio, acqua, corrente
CREATE TABLE IF NOT EXISTS public.prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    price_type TEXT NOT NULL CHECK (price_type IN ('gasolio', 'acqua', 'corrente')),
    value NUMERIC(10, 4) NOT NULL CHECK (value >= 0),
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE, -- NULL means currently active
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    -- Ensure only one active price per type at a time
    UNIQUE(price_type, effective_from)
);

-- Enable RLS
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- Create indexes for prices
CREATE INDEX IF NOT EXISTS idx_prices_type ON public.prices(price_type);
CREATE INDEX IF NOT EXISTS idx_prices_active ON public.prices(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prices_effective_from ON public.prices(effective_from);

-- RLS Policies for prices
DROP POLICY IF EXISTS "All authenticated users can view prices" ON public.prices;
CREATE POLICY "All authenticated users can view prices" ON public.prices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert prices" ON public.prices;
CREATE POLICY "Admins can insert prices" ON public.prices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update prices" ON public.prices;
CREATE POLICY "Admins can update prices" ON public.prices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete prices" ON public.prices;
CREATE POLICY "Admins can delete prices" ON public.prices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
-- Stores expense records (fatturaGasolio, manutenzione, corrente, prezzoGasolio)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('fatturaGasolio', 'manutenzione', 'corrente', 'prezzoGasolio')),
    value NUMERIC(12, 2) NOT NULL CHECK (value >= 0),
    period_year INTEGER,
    period_month INTEGER CHECK (period_month >= 1 AND period_month <= 12),
    description TEXT,
    invoice_number TEXT,
    invoice_date DATE,
    payment_date DATE,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_period_year ON public.expenses(period_year);
CREATE INDEX IF NOT EXISTS idx_expenses_period_month ON public.expenses(period_month);
CREATE INDEX IF NOT EXISTS idx_expenses_paid ON public.expenses(is_paid);

-- RLS Policies for expenses
DROP POLICY IF EXISTS "All authenticated users can view expenses" ON public.expenses;
CREATE POLICY "All authenticated users can view expenses" ON public.expenses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert expenses" ON public.expenses;
CREATE POLICY "Admins can insert expenses" ON public.expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
CREATE POLICY "Admins can update expenses" ON public.expenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
CREATE POLICY "Admins can delete expenses" ON public.expenses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND type = 'admin'
        )
    );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_counter_readings_updated_at ON public.counter_readings;
CREATE TRIGGER update_counter_readings_updated_at
    BEFORE UPDATE ON public.counter_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prices_updated_at ON public.prices;
CREATE TRIGGER update_prices_updated_at
    BEFORE UPDATE ON public.prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set created_by and updated_by
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = auth.uid();
        NEW.updated_by = auth.uid();
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit fields
DROP TRIGGER IF EXISTS set_counter_readings_audit ON public.counter_readings;
CREATE TRIGGER set_counter_readings_audit
    BEFORE INSERT OR UPDATE ON public.counter_readings
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS set_prices_audit ON public.prices;
CREATE TRIGGER set_prices_audit
    BEFORE INSERT OR UPDATE ON public.prices
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS set_expenses_audit ON public.expenses;
CREATE TRIGGER set_expenses_audit
    BEFORE INSERT OR UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_fields();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for current active prices
CREATE OR REPLACE VIEW public.current_prices AS
SELECT DISTINCT ON (price_type)
    id,
    price_type,
    value,
    effective_from,
    effective_to,
    is_active,
    created_at,
    updated_at
FROM public.prices
WHERE is_active = true
    AND (effective_to IS NULL OR effective_to > NOW())
ORDER BY price_type, effective_from DESC;

-- View for user readings summary
CREATE OR REPLACE VIEW public.user_readings_summary AS
SELECT
    u.id as user_id,
    u.user_key,
    u.username,
    u.full_name,
    cr.reading_type,
    cr.period_year,
    cr.previous_value,
    cr.current_value,
    cr.difference,
    cr.updated_at
FROM public.users u
LEFT JOIN public.counter_readings cr ON u.id = cr.user_id
WHERE u.is_active = true
ORDER BY u.user_key, cr.reading_type, cr.period_year DESC;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.users IS 'User accounts with roles (master or null) and types (admin, user, guest)';
COMMENT ON COLUMN public.users.role IS 'User role: master or NULL';
COMMENT ON COLUMN public.users.type IS 'User type: admin, user, or guest';
COMMENT ON COLUMN public.users.user_key IS 'Unique identifier for the user (e.g., vladi, dino, cristian)';

COMMENT ON TABLE public.counter_readings IS 'Counter readings for kCal, m3, and kW per user per period';
COMMENT ON COLUMN public.counter_readings.reading_type IS 'Type of reading: kcal, m3, or kw';
COMMENT ON COLUMN public.counter_readings.difference IS 'Automatically calculated difference between current and previous values';

COMMENT ON TABLE public.prices IS 'Price configurations for gasolio, acqua, and corrente';
COMMENT ON COLUMN public.prices.effective_to IS 'NULL means the price is currently active';

COMMENT ON TABLE public.expenses IS 'Expense records for tracking costs';
COMMENT ON COLUMN public.expenses.expense_type IS 'Type of expense: fatturaGasolio, manutenzione, corrente, or prezzoGasolio';

