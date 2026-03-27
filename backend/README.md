# Backend API

Express.js backend server with CRUD operations for users and authentication.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory:
```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
PROD_FRONTEND_URL=https://your-app.vercel.app
# Optional aliases (fallback): FRONTEND_URL or APP_URL
QR_AUTH_SECRET=use_a_long_random_secret
QR_AUTH_USERS=[{"key":"person-1","label":"Person 1","username":"person1","password":"person1-password"},{"key":"person-2","label":"Person 2","username":"person2","password":"person2-password"},{"key":"person-3","label":"Person 3","username":"person3","password":"person3-password"}]
PORT=3001
NODE_ENV=development
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with username and password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin12!"
}
```

**Response:**
```json
{
  "user": { ... },
  "session": {
    "access_token": "...",
    "refresh_token": "..."
  },
  "profile": {
    "id": "...",
    "username": "admin",
    "organization_id": "...",
    "role": "admin"
  }
}
```

#### POST `/api/auth/logout`
Logout the current user. Requires Bearer token in Authorization header.

#### POST `/api/auth/qr-login`
Login with a signed QR token.

**Request Body:**
```json
{
  "token": "<signed_qr_token>"
}
```

#### GET `/api/auth/me`
Get current user profile. Requires Bearer token in Authorization header.

### Users CRUD

All user endpoints require authentication (Bearer token in Authorization header).

#### GET `/api/users`
Get all users. Optional query parameters:
- `organization_id`: Filter by organization
- `role`: Filter by role (admin, guest, basic)

**Example:**
```
GET /api/users?organization_id=default-org&role=admin
```

#### GET `/api/users/:id`
Get user by ID.

#### POST `/api/users`
Create a new user.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "organization_id": "default-org",
  "role": "basic"
}
```

#### PUT `/api/users/:id`
Update user by ID.

**Request Body:**
```json
{
  "username": "updateduser",
  "organization_id": "new-org",
  "role": "admin"
}
```

#### DELETE `/api/users/:id`
Delete user by ID.

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

The access token is obtained from the login endpoint and should be stored client-side.

## Generate the 3 QR codes

Run:

```bash
npm run generate-qr-codes
```

This command outputs 3 objects (one per person) with:
- `loginUrl`: URL that opens the production Vercel app (`/login?qr=...`) and auto-authenticates.
- `qrImageUrl`: ready-to-use QR image URL you can print/share.

