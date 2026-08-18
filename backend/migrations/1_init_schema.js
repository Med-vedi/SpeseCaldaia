/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined

/**
 * Consolidated end-state schema, migrated from Supabase (backend/supabase/migrations/).
 * Unlike the original Supabase migrations, this schema:
 * - Does not FK into auth.users (public.users is now self-contained, owns password_hash).
 * - Has no RLS policies (org-scoping is enforced in application code via backend/lib/orgAccess.js
 *   and equivalent per-route checks, which is what actually gated access under Supabase too,
 *   since every route already used the service-role client that bypasses RLS).
 * - Has no auth.users trigger for profile auto-creation (moved into POST /api/users).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        organization_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'guest', 'basic')),
        email TEXT NOT NULL,
        password_hash TEXT,
        user_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        type TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_users_email_lower ON public.users (lower(email));
    CREATE INDEX idx_users_username ON public.users(username);
    CREATE INDEX idx_users_organization_id ON public.users(organization_id);

    CREATE TABLE public.counters (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        organization_id TEXT NOT NULL,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        counter_type TEXT NOT NULL CHECK (counter_type IN ('heat', 'water', 'electric', 'electric_common')),
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT counters_user_id_by_type_ck CHECK (
            (counter_type = 'electric_common' AND user_id IS NULL) OR
            (counter_type <> 'electric_common' AND user_id IS NOT NULL)
        )
    );

    CREATE INDEX idx_counters_organization_id ON public.counters(organization_id);
    CREATE INDEX idx_counters_user_id ON public.counters(user_id);
    CREATE INDEX idx_counters_type ON public.counters(counter_type);

    CREATE UNIQUE INDEX idx_counters_unique_org_electric_common
    ON public.counters (organization_id)
    WHERE counter_type = 'electric_common';

    CREATE UNIQUE INDEX idx_counters_unique_org_user_type_resident
    ON public.counters (organization_id, user_id, counter_type)
    WHERE counter_type IN ('heat', 'water', 'electric');

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

    CREATE TRIGGER trg_validate_counter_user_org
    BEFORE INSERT OR UPDATE ON public.counters
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_counter_user_org();

    CREATE TABLE public.counter_values (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        counter_id UUID REFERENCES public.counters(id) ON DELETE CASCADE NOT NULL,
        year INTEGER NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        reading_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(counter_id, year)
    );

    CREATE INDEX idx_counter_values_counter_id ON public.counter_values(counter_id);
    CREATE INDEX idx_counter_values_year ON public.counter_values(year);
    CREATE INDEX idx_counter_values_counter_year ON public.counter_values(counter_id, year);

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

    CREATE TABLE public.yearly_organization_settings (
        organization_id TEXT NOT NULL,
        year INTEGER NOT NULL,
        acqua DECIMAL(12, 4) NOT NULL DEFAULT 0,
        corrente DECIMAL(12, 6) NOT NULL DEFAULT 0,
        manutenzione DECIMAL(12, 2) NOT NULL DEFAULT 0,
        gasolio_fallback DECIMAL(12, 4),
        funzionamento_servizio_pct DECIMAL(6, 3) NOT NULL DEFAULT 20,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (organization_id, year),
        CONSTRAINT yearly_org_settings_year_range CHECK (year >= 2000 AND year <= 2100)
    );

    CREATE TABLE public.gasoil_deliveries (
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

    CREATE INDEX idx_gasoil_deliveries_org_year
        ON public.gasoil_deliveries (organization_id, year);

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
  `)
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS public.gasoil_deliveries;
    DROP TABLE IF EXISTS public.yearly_organization_settings;
    DROP TABLE IF EXISTS public.counter_values;
    DROP TABLE IF EXISTS public.counters;
    DROP TABLE IF EXISTS public.users;
    DROP FUNCTION IF EXISTS update_gasoil_deliveries_updated_at();
    DROP FUNCTION IF EXISTS update_yearly_organization_settings_updated_at();
    DROP FUNCTION IF EXISTS update_counter_values_updated_at();
    DROP FUNCTION IF EXISTS public.validate_counter_user_org();
    DROP FUNCTION IF EXISTS update_counters_updated_at();
  `)
}
