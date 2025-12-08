# Authentication Architecture

## Supabase Two-Table System

Supabase uses a two-table system for user management:

### 1. `auth.users` (Supabase Managed)
- **Purpose**: Authentication and password storage
- **Managed by**: Supabase (you don't directly modify this)
- **Contains**:
  - `id` (UUID)
  - `email`
  - `encrypted_password` (encrypted by Supabase)
  - `email_confirmed_at`
  - `created_at`, `updated_at`
  - Other auth-related fields

### 2. `public.users` (Your Profile Table)
- **Purpose**: User profile and application-specific data
- **Managed by**: Your application
- **Contains**:
  - `id` (UUID, references `auth.users.id`)
  - `username`
  - `organization_id`
  - `role` (admin, guest, basic)
  - `created_at`, `updated_at`

## How It Works

### User Creation Flow

1. **Create Auth User** (in `auth.users`):
   ```javascript
   await supabase.auth.admin.createUser({
     email: 'user@example.com',
     password: 'password123',
     email_confirm: true
   })
   ```
   - This creates the user in `auth.users` with encrypted password
   - Returns the user ID

2. **Create Profile** (in `public.users`):
   ```javascript
   await supabase
     .from('users')
     .insert({
       id: authUser.id,  // Link to auth.users
       username: 'username',
       organization_id: 'org-1',
       role: 'basic'
     })
   ```

### Login Flow

1. **Authenticate** (against `auth.users`):
   ```javascript
   await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password123'
   })
   ```
   - Supabase validates credentials against `auth.users`
   - Returns session token and user ID

2. **Fetch Profile** (from `public.users`):
   ```javascript
   await supabase
     .from('users')
     .select('*')
     .eq('id', authUser.id)
     .single()
   ```

## Why This Architecture?

- **Security**: Passwords are encrypted and managed by Supabase
- **Separation**: Auth logic separate from business logic
- **Flexibility**: Add custom fields to `public.users` without touching auth
- **RLS**: Row Level Security policies work with `auth.uid()`

## Important Notes

- **Never store passwords** in `public.users` - they belong in `auth.users`
- **Always use Supabase Auth APIs** to create/authenticate users
- **The foreign key** (`id` references `auth.users.id`) ensures data integrity
- **CASCADE DELETE**: If an auth user is deleted, the profile is automatically deleted

