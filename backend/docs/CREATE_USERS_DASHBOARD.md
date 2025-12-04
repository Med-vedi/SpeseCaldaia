# Create Users via Supabase Dashboard

Since the script is having issues with email validation, here's the easiest way to create users directly in the Supabase Dashboard:

## Method 1: Using Dashboard UI (Easiest)

### Step 1: Create Users in Authentication

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** > **Users**
3. Click **"Add user"** button
4. For each user, fill in:
   - **Email**:
     - `vlad@example.com`
     - `dino@example.com`
     - `cristian@example.com`
   - **Password**: `111111`
   - **Auto Confirm User**: ✅ (check this box - important!)
5. Click **"Create user"**
6. Repeat for all three users

### Step 2: Create User Profiles

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste this SQL:

```sql
-- Get the UUIDs of the users you just created
WITH user_ids AS (
    SELECT id, email FROM auth.users
    WHERE email IN ('vlad@example.com', 'dino@example.com', 'cristian@example.com')
)
INSERT INTO public.users (id, email, username, user_key, role, type, full_name, is_active)
SELECT
    ui.id,
    ui.email,
    CASE
        WHEN ui.email = 'vlad@example.com' THEN 'vlad'
        WHEN ui.email = 'dino@example.com' THEN 'dino'
        WHEN ui.email = 'cristian@example.com' THEN 'cristian'
    END as username,
    CASE
        WHEN ui.email = 'vlad@example.com' THEN 'vladi'
        WHEN ui.email = 'dino@example.com' THEN 'dino'
        WHEN ui.email = 'cristian@example.com' THEN 'cristian'
    END as user_key,
    CASE
        WHEN ui.email = 'dino@example.com' THEN 'master'
        ELSE NULL
    END as role,
    'admin' as type,
    CASE
        WHEN ui.email = 'vlad@example.com' THEN 'Vlad'
        WHEN ui.email = 'dino@example.com' THEN 'Dino'
        WHEN ui.email = 'cristian@example.com' THEN 'Cristian'
    END as full_name,
    true as is_active
FROM user_ids ui
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    user_key = EXCLUDED.user_key,
    role = EXCLUDED.role,
    type = EXCLUDED.type,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;
```

3. Click **"Run"**

### Step 3: Verify

Run this query to verify:

```sql
SELECT
    email,
    username,
    user_key,
    role,
    type,
    full_name,
    is_active
FROM public.users
WHERE email IN ('vlad@example.com', 'dino@example.com', 'cristian@example.com')
ORDER BY user_key;
```

Expected output:
```
email                  | username  | user_key | role   | type  | full_name | is_active
----------------------|-----------|----------|--------|-------|-----------|----------
cristian@example.com  | cristian  | cristian | NULL   | admin | Cristian  | true
dino@example.com      | dino      | dino     | master | admin | Dino      | true
vlad@example.com      | vlad      | vladi    | NULL   | admin | Vlad      | true
```

---

## Method 2: Direct SQL (Advanced)

If you have database admin access, you can use the `create-users-direct.sql` file which creates users directly in `auth.users` table. This bypasses all validation but requires direct database access.

**Note:** This method may not work if you don't have service role permissions.

---

## Login Credentials

After creating users, you can log in with:

| User | Email | Password |
|------|-------|----------|
| Vlad | vlad@example.com | 111111 |
| Dino | dino@example.com | 111111 |
| Cristian | cristian@example.com | 111111 |

---

## Troubleshooting

### "Permission denied" error
- Make sure you're running the SQL as a database admin
- Check that RLS policies allow the operation
- Try using the Dashboard UI method instead

### Users created but can't log in
- Make sure "Auto Confirm User" was checked when creating in Authentication
- Check that `email_confirmed_at` is set in `auth.users`
- Verify the password is correct

### Profile not created
- Make sure the SQL ran successfully
- Check that the UUIDs match between `auth.users` and `public.users`
- Verify the users table exists and migrations were applied

