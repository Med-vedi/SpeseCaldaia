-- Create counter_values table for yearly readings
CREATE TABLE IF NOT EXISTS public.counter_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    counter_id UUID REFERENCES public.counters(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    reading_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one value per counter per year
    UNIQUE(counter_id, year)
);

-- Enable RLS
ALTER TABLE public.counter_values ENABLE ROW LEVEL SECURITY;

-- Create policies (users can access values for counters in their organization)
CREATE POLICY "Users can view counter values in their organization" ON public.counter_values
    FOR SELECT USING (
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert counter values in their organization" ON public.counter_values
    FOR INSERT WITH CHECK (
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update counter values in their organization" ON public.counter_values
    FOR UPDATE USING (
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete counter values in their organization" ON public.counter_values
    FOR DELETE USING (
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

-- Create indexes
CREATE INDEX idx_counter_values_counter_id ON public.counter_values(counter_id);
CREATE INDEX idx_counter_values_year ON public.counter_values(year);
CREATE INDEX idx_counter_values_counter_year ON public.counter_values(counter_id, year);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_counter_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_counter_values_updated_at
    BEFORE UPDATE ON public.counter_values
    FOR EACH ROW
    EXECUTE FUNCTION update_counter_values_updated_at();

