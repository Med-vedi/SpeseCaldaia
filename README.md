# Simple Login App

A simple login application built with React, TypeScript, Tailwind CSS, Ant Design, and Supabase.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Ant Design
- **Backend**: Supabase (local development)
- **Architecture**: Monorepo structure

## Features

- User authentication with username/password
- Protected routes
- User roles and organization management
- Modern UI with Ant Design components
- Responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Start the Supabase backend:**
   ```bash
   cd backend
   npm install
   npx supabase start
   ```

2. **Create the admin user:**
   ```bash
   cd backend
   node create-admin.js
   ```

3. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Supabase Studio: http://127.0.0.1:54323

### Demo Credentials

- **Username**: admin
- **Password**: admin12!

## Project Structure

```
/
├── backend/          # Supabase backend
│   ├── supabase/     # Supabase configuration and migrations
│   └── create-admin.js # Script to create admin user
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities and configurations
│   │   └── App.tsx      # Main app component
│   └── package.json
└── README.md
```

## Database Schema

### Users Table

```sql
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    organization_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'guest', 'basic')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Available Scripts

### Backend
- `npx supabase start` - Start Supabase local development
- `npx supabase stop` - Stop Supabase local development
- `npx supabase status` - Check Supabase status

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## User Roles

- **admin**: Full access to all features
- **basic**: Standard user access
- **guest**: Limited read-only access

## Development Notes

- The application uses local Supabase instance for development
- Authentication is handled through Supabase Auth
- User profiles are stored in a custom `users` table with additional metadata
- The frontend communicates with Supabase via REST API and real-time subscriptions
