DROP POLICY IF EXISTS "Users can view counters in their organization" ON public.counters;
DROP POLICY IF EXISTS "Users can insert counters in their organization" ON public.counters;
DROP POLICY IF EXISTS "Users can update counters in their organization" ON public.counters;
DROP POLICY IF EXISTS "Users can delete counters in their organization" ON public.counters;

CREATE POLICY "Users can view counters in their organization" ON public.counters
    FOR SELECT USING (
        auth.uid() IS NULL OR
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert counters in their organization" ON public.counters
    FOR INSERT WITH CHECK (
        auth.uid() IS NULL OR
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update counters in their organization" ON public.counters
    FOR UPDATE USING (
        auth.uid() IS NULL OR
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete counters in their organization" ON public.counters
    FOR DELETE USING (
        auth.uid() IS NULL OR
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view counter values in their organization" ON public.counter_values;
DROP POLICY IF EXISTS "Users can insert counter values in their organization" ON public.counter_values;
DROP POLICY IF EXISTS "Users can update counter values in their organization" ON public.counter_values;
DROP POLICY IF EXISTS "Users can delete counter values in their organization" ON public.counter_values;

CREATE POLICY "Users can view counter values in their organization" ON public.counter_values
    FOR SELECT USING (
        auth.uid() IS NULL OR
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert counter values in their organization" ON public.counter_values
    FOR INSERT WITH CHECK (
        auth.uid() IS NULL OR
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update counter values in their organization" ON public.counter_values
    FOR UPDATE USING (
        auth.uid() IS NULL OR
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete counter values in their organization" ON public.counter_values
    FOR DELETE USING (
        auth.uid() IS NULL OR
        counter_id IN (
            SELECT id FROM public.counters
            WHERE organization_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

