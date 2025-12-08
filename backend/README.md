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

