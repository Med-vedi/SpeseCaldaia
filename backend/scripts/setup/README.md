# Setup Scripts

This folder contains scripts for setting up users and the database.

## Scripts

### JavaScript Files
- **`create-admin.js`** - Creates an admin user via Supabase Auth API
- **`create-users.js`** - Creates all three users (vlad, dino, cristian)
- **`setup.js`** - Interactive setup script for creating users

### SQL Files
- **`fix-and-create-users.sql`** - Comprehensive script that fixes table structure and creates user profiles (RECOMMENDED)
- **`quick-create-users.sql`** - Quick script to create user profiles after creating users in Dashboard
- **`create-users-sql.sql`** - SQL for creating users via Dashboard
- **`create-users-direct.sql`** - Direct SQL to create users (requires database admin access)
- **`create-admin.sql`** - Legacy SQL for creating admin user
- **`setup-database.sql`** - Reference file (actual schema is in migrations)

## Usage

### Recommended: Dashboard Method
1. Create users in Supabase Dashboard > Authentication > Users
2. Run `fix-and-create-users.sql` in SQL Editor

### Alternative: Script Method
```bash
npm run create-users
```

See `../../docs/USER_SETUP_GUIDE.md` for detailed instructions.

