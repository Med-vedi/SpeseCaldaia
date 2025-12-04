# Organization Structure

## Overview

All data in the application is chained to `organization_id` through the `users` table. This allows multiple organizations to exist independently, each with their own:
- Users
- Counter readings
- Prices
- Expenses
- All other data

## Data Chaining

### How Data is Linked to Organization

1. **Users Table** (source of truth)
   - `users.organization_id` - The organization identifier
   - Default value: `'0'`

2. **Counter Readings**
   - `counter_readings.user_id` → `users.id` → `users.organization_id`
   - Filtered by: Get users in organization → Get their readings

3. **Prices**
   - `prices.created_by` → `users.id` → `users.organization_id`
   - Filtered by: Get users in organization → Get prices they created

4. **Expenses**
   - `expenses.created_by` → `users.id` → `users.organization_id`
   - Filtered by: Get users in organization → Get expenses they created

## Setting Organization ID

### For Existing Users

Run this SQL in Supabase SQL Editor:

```sql
UPDATE public.users
SET organization_id = '0'
WHERE organization_id IS NULL;
```

Or use the migration script:
- `backend/supabase/migrations/20250101000003_set_default_organization.sql`

Or use the setup script:
- `backend/scripts/setup/set-organization-id.sql`

### For New Organizations

To create a new organization:

1. Set `organization_id` when creating users:
   ```sql
   INSERT INTO public.users (..., organization_id)
   VALUES (..., 'org-1');
   ```

2. All data created by those users will automatically be linked to that organization through:
   - `counter_readings.user_id`
   - `prices.created_by`
   - `expenses.created_by`

## Frontend Filtering

The frontend automatically filters all data by the logged-in user's `organization_id`:

1. User logs in → Profile fetched with `organization_id`
2. All queries filter by getting users in that organization first
3. Then fetch data for those users only

## Multi-Organization Support

The system supports multiple organizations:

- **Organization '0'**: Default organization
- **Organization 'org-1'**: Example second organization
- **Organization 'org-2'**: Example third organization
- etc.

Each organization is completely isolated:
- Users in org-1 cannot see data from org-2
- Counter readings are separate
- Prices are separate
- Expenses are separate

## Example: Creating a New Organization

```sql
-- 1. Create users for new organization
INSERT INTO public.users (email, username, user_key, organization_id, type, full_name)
VALUES
  ('user1@org2.com', 'user1', 'user1', 'org-2', 'admin', 'User 1'),
  ('user2@org2.com', 'user2', 'user2', 'org-2', 'user', 'User 2');

-- 2. Create counter readings (will be linked through user_id)
INSERT INTO public.counter_readings (user_id, reading_type, period_year, current_value)
SELECT id, 'kcal', 2025, 1000
FROM public.users
WHERE organization_id = 'org-2';

-- 3. Create prices (will be linked through created_by)
INSERT INTO public.prices (price_type, value, created_by)
SELECT 'gasolio', 1.50, id
FROM public.users
WHERE organization_id = 'org-2' AND type = 'admin'
LIMIT 1;
```

## Verification Queries

### Check users by organization
```sql
SELECT organization_id, COUNT(*) as user_count
FROM public.users
GROUP BY organization_id;
```

### Check counter readings by organization
```sql
SELECT u.organization_id, COUNT(*) as reading_count
FROM public.counter_readings cr
JOIN public.users u ON cr.user_id = u.id
GROUP BY u.organization_id;
```

### Check prices by organization
```sql
SELECT u.organization_id, COUNT(*) as price_count
FROM public.prices p
JOIN public.users u ON p.created_by = u.id
WHERE p.is_active = true
GROUP BY u.organization_id;
```

### Check expenses by organization
```sql
SELECT u.organization_id, COUNT(*) as expense_count
FROM public.expenses e
JOIN public.users u ON e.created_by = u.id
GROUP BY u.organization_id;
```

