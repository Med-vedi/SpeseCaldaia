# SpeseCaldaia Backend

Backend setup for the SpeseCaldaia application using Supabase.

## 📁 Folder Structure

```
backend/
├── supabase/                    # Supabase configuration and migrations
│   ├── migrations/             # Database migration files
│   ├── seed.sql                # Basic seed data (runs automatically)
│   └── config.toml            # Supabase local config
├── scripts/                    # Setup and utility scripts
│   ├── setup/                 # User creation scripts
│   │   ├── create-admin.js
│   │   ├── create-users.js
│   │   ├── setup.js
│   │   ├── fix-and-create-users.sql
│   │   ├── quick-create-users.sql
│   │   ├── create-users-sql.sql
│   │   └── create-users-direct.sql
│   └── seeds/                 # Data seeding scripts
│       └── seed-initial-data.sql
├── docs/                      # Documentation
│   ├── USER_SETUP_GUIDE.md
│   ├── CREATE_USERS_DASHBOARD.md
│   └── SEED_DATA_GUIDE.md
├── package.json
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

**Option A: Local Development (requires Supabase CLI)**

```bash
# Install Supabase CLI
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase

# Verify installation
supabase --version
```

**Option B: Hosted Supabase (no CLI needed)**

- Use Supabase Dashboard directly
- No installation required

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

**For Local Development (with CLI):**

```bash
supabase start
supabase db reset  # Applies migrations and runs seed.sql
```

**For Hosted Supabase (Dashboard method):**

1. Go to Supabase Dashboard > SQL Editor
2. Apply migrations in order:
   - `supabase/migrations/20251127163805_create_users_table.sql`
   - `supabase/migrations/20250101000000_create_complete_schema.sql`
   - `supabase/migrations/20250101000001_migrate_users_table.sql`

See `INSTALLATION.md` for detailed installation instructions.

### 3. Create Users

**Option A: Using Dashboard (Recommended)**

1. Create users in Supabase Dashboard > Authentication > Users
2. Run `scripts/setup/fix-and-create-users.sql` in SQL Editor

**Option B: Using Script**

```bash
npm run create-users
```

See `docs/USER_SETUP_GUIDE.md` for detailed instructions.

### 4. Seed Initial Data

After users are created, seed counter readings, prices, and expenses:

1. Go to Supabase Dashboard > SQL Editor
2. Run `scripts/seeds/seed-initial-data.sql`

See `docs/SEED_DATA_GUIDE.md` for details.

## 📋 Available Scripts

```bash
npm run setup          # Interactive setup script
npm run create-admin   # Create admin user
npm run create-users   # Create all three users
npm run db:reset       # Reset database (local)
npm run db:push        # Push migrations (production)
npm run start          # Start Supabase locally
npm run stop           # Stop Supabase locally
npm run status         # Check Supabase status
```

## 📚 Documentation

- **User Setup**: `docs/USER_SETUP_GUIDE.md`
- **Dashboard Method**: `docs/CREATE_USERS_DASHBOARD.md`
- **Data Seeding**: `docs/SEED_DATA_GUIDE.md`

## 🗄️ Database Schema

The database includes:

- **users**: User accounts with roles (master/null) and types (admin/user/guest)
- **counter_readings**: kCal, m3, kW readings per user per period
- **prices**: Price configurations (gasolio, acqua, corrente)
- **expenses**: Expense records (fatturaGasolio, manutenzione, etc.)

See `supabase/migrations/` for complete schema.

## 🏢 Multi-Organization Support

The schema supports multiple organizations (houses):

- Users have `organization_id` field
- Currently set to `'default-organization'`
- Future: Create organizations table and link users
- Filter data by `organization_id` when querying

## 🔐 Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional, for admin operations
```

## 📝 Migration Files

- `20251127163805_create_users_table.sql` - Legacy users table
- `20250101000000_create_complete_schema.sql` - Complete schema with all tables
- `20250101000001_migrate_users_table.sql` - Migration helper for existing data

## ⚠️ Important Notes

1. **Migrations must be run first** before seeding data
2. **Users must be created** before seeding counter readings
3. **Service role key** is needed for admin operations (optional)
4. **Organization support** is built-in but uses default organization initially

## 🐛 Troubleshooting

### "Table does not exist" errors

- Run migrations: `supabase db reset` (local) or apply migrations (production)

### "User not allowed" errors

- Use Dashboard method or add `SUPABASE_SERVICE_ROLE_KEY` to `.env`

### "Column does not exist" errors

- Run migration `20250101000001_migrate_users_table.sql` to update schema

## 🔄 Workflow

1. **Initial Setup:**

   ```bash
   npm install
   supabase start
   supabase db reset
   ```

2. **Create Users:**

   - Use Dashboard or `npm run create-users`

3. **Seed Data:**

   - Run `scripts/seeds/seed-initial-data.sql` in SQL Editor

4. **Development:**
   - Make changes to migrations
   - Test locally with `supabase db reset`
   - Push to production with `supabase db push`
