-- Create counters table
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    counter_type TEXT NOT NULL CHECK (counter_type IN ('heat', 'water', 'electric', 'electric_common')),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraint: electric_common should not have user_id
    CONSTRAINT electric_common_no_user CHECK (
        (counter_type = 'electric_common' AND user_id IS NULL) OR
        (counter_type != 'electric_common')
    )
);

-- Enable RLS
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view counters in their organization" ON public.counters
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert counters in their organization" ON public.counters
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update counters in their organization" ON public.counters
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete counters in their organization" ON public.counters
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX idx_counters_organization_id ON public.counters(organization_id);
CREATE INDEX idx_counters_user_id ON public.counters(user_id);
CREATE INDEX idx_counters_type ON public.counters(counter_type);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_counters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_counters_updated_at
    BEFORE UPDATE ON public.counters
    FOR EACH ROW
    EXECUTE FUNCTION update_counters_updated_at();

