# Seed Scripts

This folder contains scripts for seeding initial data into the database.

## Scripts

- **`seed-initial-data.sql`** - Seeds counter readings, prices, and expenses

## Prerequisites

1. ✅ Database migrations must be applied
2. ✅ Users must be created first
3. ✅ Users must have `organization_id` set

## Usage

1. Go to Supabase Dashboard > SQL Editor
2. Open `seed-initial-data.sql`
3. Copy and paste the entire script
4. Click "Run"
5. Verify data using the queries at the end of the script

## What It Seeds

- **Counter Readings**: kCal, m3, kW readings for 2024 period
- **Prices**: Gasolio (1.28), Acqua (2.00), Corrente (0.14)
- **Expenses**: Fattura Gasolio, Manutenzione, etc. for 2025

See `../../docs/SEED_DATA_GUIDE.md` for detailed information.

