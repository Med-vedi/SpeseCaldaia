# Setup Checklist

Follow these steps in order to set up the SpeseCaldaia backend.

## ✅ Step 1: Install Dependencies

```bash
cd backend
npm install
```

## ✅ Step 2: Apply Database Migrations

**CRITICAL:** This must be done before creating users or seeding data!

### Option A: Local Development (requires Supabase CLI)

**First, install Supabase CLI:**
```bash
# macOS
brew install supabase/tap/supabase

# or using npm
npm install -g supabase
```

**Then apply migrations:**
```bash
supabase start
supabase db reset
```

### Option B: Hosted Supabase (Dashboard - No CLI needed)

1. Go to Supabase Dashboard > SQL Editor
2. Run migrations in order (copy and paste each file):
   - `supabase/migrations/20251127163805_create_users_table.sql`
   - `supabase/migrations/20250101000000_create_complete_schema.sql`
   - `supabase/migrations/20250101000001_migrate_users_table.sql`

**Note:** If you don't have Supabase CLI installed, use Option B (Dashboard method).

## ✅ Step 3: Create Users

### Option A: Dashboard Method (Recommended)
1. Go to Supabase Dashboard > Authentication > Users
2. Create users:
   - `medvedivladislav@gmail.com` / `111111`
   - `dino@example.com` / `111111`
   - `cristian@example.com` / `111111`
   - Check "Auto Confirm User" for each
3. Go to SQL Editor
4. Run `scripts/setup/fix-and-create-users.sql`

### Option B: Script Method
```bash
npm run create-users
```

## ✅ Step 4: Seed Initial Data

1. Go to Supabase Dashboard > SQL Editor
2. Run `scripts/seeds/seed-initial-data.sql`

This will seed:
- Counter readings (kCal, m3, kW)
- Prices (gasolio, acqua, corrente)
- Expenses (fatturaGasolio, manutenzione, etc.)

## ✅ Step 5: Verify Setup

Run these queries in SQL Editor to verify:

```sql
-- Check users
SELECT email, username, user_key, role, type FROM public.users;

-- Check counter readings
SELECT COUNT(*) FROM public.counter_readings;

-- Check prices
SELECT * FROM public.prices WHERE is_active = true;

-- Check expenses
SELECT * FROM public.expenses WHERE period_year = 2025;
```

## 🐛 Troubleshooting

### "Table does not exist" errors
**Solution:** Run migrations first (Step 2)

### "User not allowed" errors
**Solution:** Use Dashboard method or add `SUPABASE_SERVICE_ROLE_KEY` to `.env`

### "Column does not exist" errors
**Solution:** Run migration `20250101000001_migrate_users_table.sql`

## 📁 File Locations

- **Migrations**: `supabase/migrations/`
- **Setup Scripts**: `scripts/setup/`
- **Seed Scripts**: `scripts/seeds/`
- **Documentation**: `docs/`

## 🎯 Quick Reference

```bash
# Full local setup
npm install
supabase start
supabase db reset
# Then create users and seed data via Dashboard
```

