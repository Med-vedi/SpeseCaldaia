# User Setup Guide for SpeseCaldaia

This guide helps you create the three initial users in Supabase.

## Users to Create

1. **Vlad** - admin (no master role)
   - Email: `vlad@spesecaldaia.test`
   - User key: `vladi`
   - Type: `admin`
   - Role: `NULL` (not master)

2. **Dino** - admin, master
   - Email: `dino@spesecaldaia.test`
   - User key: `dino`
   - Type: `admin`
   - Role: `master`

3. **Cristian** - admin (no master role)
   - Email: `cristian@spesecaldaia.test`
   - User key: `cristian`
   - Type: `admin`
   - Role: `NULL` (not master)

**Password for all:** `111111` (6 characters minimum - you can change this later)

---

## Method 1: Using the Script (Recommended)

### Prerequisites
1. Make sure you have a `.env` file in the backend directory with:
   ```env
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. Make sure the database migrations have been applied (run `npm run db:reset` or apply migrations manually)

### Steps

1. **Run the script:**
   ```bash
   cd backend
   npm run create-users
   ```

2. The script will:
   - Create users in Supabase Authentication
   - Create user profiles in the `public.users` table
   - Handle existing users gracefully

3. **Verify:**
   - Check Supabase Dashboard > Authentication > Users
   - Check Supabase Dashboard > Table Editor > users table

---

## Method 2: Using Supabase Dashboard (Manual)

### Step 1: Create Users in Authentication

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add user"** button
4. For each user, fill in:
   - **Email**: `vlad@spesecaldaia.test` (then dino, then cristian)
   - **Password**: `111111` (6 characters minimum)
   - **Auto Confirm User**: ✅ (check this box)
5. Click **"Create user"**
6. Repeat for all three users

### Step 2: Create User Profiles

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste the SQL from `create-users-sql.sql`
3. **Option A**: If you know the UUIDs:
   - Go to Authentication > Users
   - Copy the UUID for each user
   - Replace `REPLACE_WITH_VLAD_UUID`, etc. in the SQL
   - Run the SQL

4. **Option B**: Use the auto-detect SQL (recommended):
   - Use the second part of `create-users-sql.sql` (Option 2)
   - This will automatically find users by email and create profiles
   - Just run the SQL as-is

5. **Verify** by running the SELECT query at the end of the SQL file

---

## Method 3: Using Supabase CLI (Local Development)

If you're running Supabase locally:

1. **Start Supabase:**
   ```bash
   cd backend
   supabase start
   ```

2. **Apply migrations:**
   ```bash
   supabase db reset
   ```

3. **Run the script:**
   ```bash
   npm run create-users
   ```

---

## Verification

After creating users, verify they exist:

### In Supabase Dashboard:

1. **Authentication > Users**: Should see 3 users
2. **Table Editor > users**: Should see 3 rows with:
   - `vlad@spesecaldaia.test` - type: admin, role: NULL
   - `dino@spesecaldaia.test` - type: admin, role: master
   - `cristian@spesecaldaia.test` - type: admin, role: NULL

### Using SQL:

Run this query in SQL Editor:
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
WHERE email IN (
    'vlad@spesecaldaia.test',
    'dino@spesecaldaia.test',
    'cristian@spesecaldaia.test'
)
ORDER BY user_key;
```

Expected output:
```
email                        | username  | user_key | role   | type  | full_name | is_active
----------------------------|-----------|----------|--------|-------|-----------|----------
cristian@spesecaldaia.test | cristian  | cristian | NULL   | admin | Cristian  | true
dino@spesecaldaia.test     | dino      | dino     | master | admin | Dino      | true
vlad@spesecaldaia.test     | vlad      | vladi    | NULL   | admin | Vlad      | true
```

---

## Troubleshooting

### "User already exists" error
- The script handles this automatically
- If using SQL, use `ON CONFLICT` clauses (already included)

### "Table users does not exist"
- Make sure migrations have been applied
- Run `supabase db reset` (local) or apply migrations (production)

### "Permission denied" error
- Check RLS policies are set up correctly
- Make sure you're using the service role key for admin operations
- Check that the migrations ran successfully

### Users created but can't log in
- Check that email confirmation is disabled (for local development)
- In Supabase Dashboard > Authentication > Settings, disable "Confirm email"
- Or manually confirm emails in Authentication > Users

---

## Next Steps

After creating users:
1. Test login with each user
2. Update passwords (recommended)
3. Add initial counter readings if needed
4. Configure prices and expenses

---

## Security Notes

⚠️ **Important:**
- The password `111111` is very weak - change it immediately after setup
- For production, use strong passwords
- Consider enabling email confirmation for production
- Review RLS policies to ensure proper access control

