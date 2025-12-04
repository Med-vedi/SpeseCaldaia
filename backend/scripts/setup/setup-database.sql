-- Setup script for SpeseCaldaia database
-- This file is kept for reference but migrations should be used instead
-- Run migrations using: supabase db reset (for local) or apply migrations to production

-- NOTE: The actual schema is defined in migrations/20250101000000_create_complete_schema.sql
-- This file is kept for documentation purposes

-- To set up the database:
-- 1. For local development: Run `supabase db reset` in the backend directory
-- 2. For production: Apply migrations through Supabase dashboard or CLI
-- 3. Create users through Supabase Auth API first, then insert profiles in public.users

-- The migration file includes:
-- - users table with roles (master/null) and types (admin/user/guest)
-- - counter_readings table for kCal, m3, kW readings
-- - prices table for gasolio, acqua, corrente
-- - expenses table for expense tracking
-- - RLS policies for security
-- - Triggers for automatic timestamp and audit field updates
-- - Views for common queries

-- See migrations/20250101000000_create_complete_schema.sql for the complete schema
