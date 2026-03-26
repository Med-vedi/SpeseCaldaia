ALTER TABLE public.yearly_organization_settings
ADD COLUMN IF NOT EXISTS funzionamento_servizio_pct DECIMAL(6, 3) NOT NULL DEFAULT 20;

