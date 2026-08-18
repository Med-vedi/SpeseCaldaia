# Authentication Architecture

## Single-Table System

Auth and profile data both live in `public.users` — there is no separate auth-provider table.

- `id` (UUID, primary key)
- `username` (unique)
- `organization_id`
- `role` (admin, guest, basic)
- `email` (unique, case-insensitive)
- `password_hash` (bcrypt, via `lib/passwords.js`)
- `user_key` (stable UUID used for QR login)
- `type` (currently defaulted to `user`)
- `created_at`, `updated_at`

## How It Works

### User Creation Flow

`POST /api/users` (see `routes/users.js`) hashes the password with bcrypt and inserts one row into `public.users` directly — no separate auth-provider call, no two-phase create/rollback.

### Login Flow

1. **Resolve credential identifier**: backend login accepts a username-like identifier. If the input isn't an email, it's resolved via `users.username`.
2. **Authenticate**: `bcrypt.compare(password, password_hash)` against the matched row (`lib/passwords.js`).
3. **Issue a session**: on success, `lib/jwt.js` signs a JWT (`{ sub: userId }`, `JWT_EXPIRES_IN`) with `JWT_SECRET`. No separate session store — JWTs are stateless.

### Request Authentication

Every protected route is mounted behind `middleware/authenticate.js`, which verifies the bearer JWT and re-fetches `{ id, email }` from `public.users` on every request (profile data is never trusted from the token itself).

### QR Login

`POST /api/auth/qr-login` verifies a separate, non-JWT HMAC-signed token (`lib/qrAuth.js`, keyed by `QR_AUTH_SECRET`) that encodes a user's `user_key`. On a match, the backend signs a normal JWT directly for that user — no magic-link/OTP exchange involved.

## Why This Architecture?

- **Simplicity**: one table, one code path for both identity and profile data.
- **No vendor auth service**: Neon is plain Postgres; auth is implemented in `lib/jwt.js` + `lib/passwords.js`, not an external provider.
- **Org-scoping enforced in application code**: see `lib/orgAccess.js` — there is no RLS in this schema (see `migrations/1_init_schema.js`).

## Important Notes

- **Passwords** are only ever stored as bcrypt hashes in `password_hash` — never log or return this column (`toPublicUser()` helpers strip it from API responses).
- **CASCADE DELETE**: deleting a `public.users` row cascades to that user's `counters` rows (`ON DELETE CASCADE`).
