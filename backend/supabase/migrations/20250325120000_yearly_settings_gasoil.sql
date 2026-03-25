-- Per-year utility prices, maintenance, optional gasolio fallback; gasolio totals from gasoil_deliveries
CREATE TABLE IF NOT EXISTS public.yearly_organization_settings (
    organization_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    acqua DECIMAL(12, 4) NOT NULL DEFAULT 0,
    corrente DECIMAL(12, 6) NOT NULL DEFAULT 0,
    manutenzione DECIMAL(12, 2) NOT NULL DEFAULT 0,
    -- Used only when sum(liters) for the year is 0 (e.g. invoice without volume on file)
    gasolio_fallback DECIMAL(12, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (organization_id, year),
    CONSTRAINT yearly_org_settings_year_range CHECK (year >= 2000 AND year <= 2100)
);

CREATE TABLE IF NOT EXISTS public.gasoil_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    label TEXT,
    liters DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_eur DECIMAL(12, 2) NOT NULL DEFAULT 0,
    bill_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT gasoil_deliveries_year_range CHECK (year >= 2000 AND year <= 2100),
    UNIQUE (organization_id, year, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_gasoil_deliveries_org_year
    ON public.gasoil_deliveries (organization_id, year);

ALTER TABLE public.yearly_organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gasoil_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "yearly_settings_org_select" ON public.yearly_organization_settings
    FOR SELECT USING (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "yearly_settings_org_insert" ON public.yearly_organization_settings
    FOR INSERT WITH CHECK (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "yearly_settings_org_update" ON public.yearly_organization_settings
    FOR UPDATE USING (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "yearly_settings_org_delete" ON public.yearly_organization_settings
    FOR DELETE USING (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "gasoil_deliveries_org_select" ON public.gasoil_deliveries
    FOR SELECT USING (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "gasoil_deliveries_org_insert" ON public.gasoil_deliveries
    FOR INSERT WITH CHECK (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "gasoil_deliveries_org_update" ON public.gasoil_deliveries
    FOR UPDATE USING (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "gasoil_deliveries_org_delete" ON public.gasoil_deliveries
    FOR DELETE USING (
        organization_id = (SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE OR REPLACE FUNCTION update_yearly_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_yearly_organization_settings_updated_at
    BEFORE UPDATE ON public.yearly_organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_yearly_organization_settings_updated_at();

CREATE OR REPLACE FUNCTION update_gasoil_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_gasoil_deliveries_updated_at
    BEFORE UPDATE ON public.gasoil_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_gasoil_deliveries_updated_at();
