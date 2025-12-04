# Installation Guide

## Install Supabase CLI

### Option 1: Using Homebrew (macOS - Recommended)

```bash
brew install supabase/tap/supabase
```

### Option 2: Using npm

```bash
npm install -g supabase
```

### Option 3: Using other package managers

See [Supabase CLI Installation](https://supabase.com/docs/guides/cli/getting-started) for other methods.

## Verify Installation

```bash
supabase --version
```

## Setup Options

### Option A: Local Development (with Supabase CLI)

1. **Install Supabase CLI** (see above)
2. **Start local Supabase:**
   ```bash
   cd backend
   supabase start
   ```
3. **Apply migrations:**
   ```bash
   supabase db reset
   ```
4. **Create users and seed data** (see SETUP_CHECKLIST.md)

### Option B: Production/Hosted Supabase (No CLI needed)

If you're using hosted Supabase (supabase.com), you don't need the CLI:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **SQL Editor**

2. **Apply Migrations Manually:**
   - Run each migration file in order:
     - `supabase/migrations/20251127163805_create_users_table.sql`
     - `supabase/migrations/20250101000000_create_complete_schema.sql`
     - `supabase/migrations/20250101000001_migrate_users_table.sql`

3. **Create Users:**
   - Use Dashboard > Authentication > Users
   - Then run `scripts/setup/fix-and-create-users.sql` in SQL Editor

4. **Seed Data:**
   - Run `scripts/seeds/seed-initial-data.sql` in SQL Editor

## Quick Start (Hosted Supabase)

If you're using hosted Supabase and don't want to install CLI:

1. **Apply Migrations:**
   - Go to Supabase Dashboard > SQL Editor
   - Copy and paste each migration file content
   - Run them in order

2. **Create Users:**
   - Dashboard > Authentication > Users
   - Create: `medvedivladislav@gmail.com`, `dino@example.com`, `cristian@example.com`
   - Run `scripts/setup/fix-and-create-users.sql`

3. **Seed Data:**
   - Run `scripts/seeds/seed-initial-data.sql`

## Troubleshooting

### "command not found: supabase"
- Install Supabase CLI (see above)
- Or use the Dashboard method (no CLI needed)

### "Cannot connect to database"
- For local: Make sure `supabase start` completed successfully
- For hosted: Check your connection settings in Dashboard

### "Migration errors"
- Make sure migrations are run in the correct order
- Check that previous migrations completed successfully

