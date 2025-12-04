# SpeseCaldaia Backend

Backend setup for the SpeseCaldaia application using Supabase.

## Database Schema

The database includes the following tables:

### Users Table
- **id**: UUID (references auth.users)
- **email**: User email address
- **username**: Username
- **user_key**: Unique identifier (e.g., 'vladi', 'dino', 'cristian')
- **role**: 'master' or NULL
- **type**: 'admin', 'user', or 'guest'
- **full_name**: Full name (optional)
- **phone**: Phone number (optional)
- **is_active**: Boolean flag
- **created_at**, **updated_at**: Timestamps

### Counter Readings Table
Stores counter readings for each user:
- **user_id**: References users table
- **reading_type**: 'kcal', 'm3', or 'kw'
- **period_year**: Year of the reading period
- **previous_value**: Previous reading value
- **current_value**: Current reading value
- **difference**: Automatically calculated difference
- **notes**: Optional notes

### Prices Table
Stores price configurations:
- **price_type**: 'gasolio', 'acqua', or 'corrente'
- **value**: Price value
- **effective_from**: When the price becomes effective
- **effective_to**: When the price expires (NULL = active)
- **is_active**: Boolean flag

### Expenses Table
Stores expense records:
- **expense_type**: 'fatturaGasolio', 'manutenzione', 'corrente', or 'prezzoGasolio'
- **value**: Expense amount
- **period_year**: Year of the expense
- **period_month**: Month of the expense (optional)
- **description**: Expense description
- **invoice_number**: Invoice number (optional)
- **invoice_date**: Invoice date (optional)
- **payment_date**: Payment date (optional)
- **is_paid**: Payment status

## Setup Instructions

### Prerequisites
- Node.js installed
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project (local or remote)

### Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Supabase locally:**
   ```bash
   supabase start
   ```

3. **Apply migrations:**
   ```bash
   supabase db reset
   ```
   This will apply all migrations and run seed data.

4. **Create admin user:**
   ```bash
   node create-admin.js
   ```
   Note: Make sure to set `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables.

### Production Setup

1. **Link to your Supabase project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Apply migrations:**
   ```bash
   supabase db push
   ```

3. **Create users through Supabase Auth:**
   - Use Supabase Dashboard or Auth API to create users
   - Then insert user profiles in `public.users` table

### Environment Variables

Create a `.env` file in the backend directory:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for admin operations)
```

## Creating Users

### Method 1: Through Supabase Auth API

1. Create user in `auth.users` via Supabase Auth:
   ```javascript
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'secure-password',
   })
   ```

2. Insert profile in `public.users`:
   ```sql
   INSERT INTO public.users (id, email, username, user_key, role, type, full_name)
   VALUES (
     '<user-id-from-auth>',
     'user@example.com',
     'username',
     'user_key',  -- e.g., 'vladi', 'dino', 'cristian'
     NULL,         -- or 'master'
     'user',       -- or 'admin', 'guest'
     'Full Name'
   );
   ```

### Method 2: Using create-admin.js script

The `create-admin.js` script creates an admin user with:
- role: 'master'
- type: 'admin'
- user_key: 'admin'

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Users**: Can view their own profile and all active users. Admins can view/update all users.
- **Counter Readings**: All authenticated users can view all readings. Users can insert/update their own readings. Admins can manage all readings.
- **Prices**: All authenticated users can view prices. Only admins can insert/update/delete prices.
- **Expenses**: All authenticated users can view expenses. Only admins can insert/update/delete expenses.

## Database Functions and Triggers

- **update_updated_at_column()**: Automatically updates `updated_at` timestamp on row updates
- **set_audit_fields()**: Automatically sets `created_by` and `updated_by` fields
- **get_or_create_user()**: Helper function for user management

## Views

- **current_prices**: View of currently active prices
- **user_readings_summary**: Summary view of user readings

## Migration Files

- `20251127163805_create_users_table.sql`: Legacy migration (kept for reference)
- `20250101000000_create_complete_schema.sql`: Complete schema with all tables

## Notes

- The `difference` field in `counter_readings` is automatically calculated using a generated column
- Prices support versioning with `effective_from` and `effective_to` timestamps
- All tables include audit fields (`created_by`, `updated_by`) that are automatically set
- The schema is designed to handle multiple periods/years of data

