# Seed Initial Data Guide

This guide explains how to seed the initial data (counter readings, prices, expenses) for SpeseCaldaia.

## Overview

The seed script (`seed-initial-data.sql`) creates:
- **Organization assignment**: Sets all users to a default organization
- **Counter readings**: kCal, m3, and kW readings for 2024 and 2025 periods
- **Prices**: Gasolio, acqua, and corrente prices
- **Expenses**: Initial expense records for 2025

## Data Structure

### Counter Readings

The script seeds readings for three users:
- **Vladi** (vladi)
- **Dino** (dino) - also stores "comune" (shared) kW readings
- **Cristian** (cristian)

**kCal Readings (2024 period):**
- Vladi: 124637.7 → 125769.7
- Dino: 80818.7 → 82048.3
- Cristian: 86479 → 86479

**m3 Readings (2024 period):**
- Vladi: 390 → 422
- Dino: 782 → 830
- Cristian: 342 → 359

**kW Readings (2024 period - shared/comune):**
- Comune: 2861 → 3192.3 (stored with Dino as master user)

### Prices

- **Gasolio**: 1.28 €
- **Acqua**: 2.00 €
- **Corrente**: 0.14 €

### Expenses (2025)

- **Fattura Gasolio**: 1280.00 €
- **Manutenzione**: 120.00 €
- **Prezzo Gasolio**: 1.28 €
- **Corrente**: 46.40 € (calculated: 331.3 kW × 0.14)

## How to Run

1. **Make sure users are created first**
   - Run `fix-and-create-users.sql` if you haven't already

2. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Navigate to **SQL Editor**

3. **Run the seed script**
   - Open `seed-initial-data.sql`
   - Copy and paste the entire script
   - Click **"Run"**

4. **Verify the data**
   - The script includes verification queries at the end
   - Check that all data was inserted correctly

## Multi-Organization Support

The script sets all users to `organization_id = 'default-organization'`.

**For future multi-organization support:**

1. Create an `organizations` table:
```sql
CREATE TABLE public.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. Insert organizations:
```sql
INSERT INTO public.organizations (id, name) VALUES
    ('default-organization', 'Default House'),
    ('house-2', 'House 2'),
    ('house-3', 'House 3');
```

3. Update users to link to organizations:
```sql
UPDATE public.users
SET organization_id = 'house-2'
WHERE email IN ('user1@example.com', 'user2@example.com');
```

4. Filter data by organization:
```sql
-- Get counter readings for a specific organization
SELECT * FROM public.counter_readings cr
JOIN public.users u ON cr.user_id = u.id
WHERE u.organization_id = 'house-2';
```

## Updating Data

### Update Counter Readings

```sql
UPDATE public.counter_readings
SET current_value = 125800.0
WHERE user_id = (SELECT id FROM public.users WHERE user_key = 'vladi')
    AND reading_type = 'kcal'
    AND period_year = 2024;
```

### Update Prices

```sql
-- Deactivate old price
UPDATE public.prices
SET is_active = false, effective_to = NOW()
WHERE price_type = 'gasolio' AND is_active = true;

-- Insert new price
INSERT INTO public.prices (price_type, value, effective_from, is_active)
VALUES ('gasolio', 1.35, NOW(), true);
```

### Update Expenses

```sql
UPDATE public.expenses
SET value = 1300.00
WHERE expense_type = 'fatturaGasolio'
    AND period_year = 2025
    AND period_month = 1;
```

## Notes

- **kW readings**: Currently stored with the master user (dino) as they represent shared/common readings
- **Period structure**: Readings are organized by `period_year`. You can add more periods (2026, 2027, etc.) as needed
- **Calculated fields**: The `difference` field in `counter_readings` is automatically calculated
- **Price versioning**: Prices support versioning with `effective_from` and `effective_to` dates

## Troubleshooting

### "User not found" errors
- Make sure users were created first using `fix-and-create-users.sql`
- Verify user emails match: `medvedivladislav@gmail.com`, `dino@example.com`, `cristian@example.com`

### "Duplicate key" errors
- The script uses `ON CONFLICT` clauses, so it's safe to run multiple times
- If you want to reset data, delete existing records first:
```sql
DELETE FROM public.counter_readings;
DELETE FROM public.expenses;
DELETE FROM public.prices;
```

### Missing organization_id
- The script sets `organization_id = 'default-organization'` for all users
- If you get errors, make sure users have this organization_id set

