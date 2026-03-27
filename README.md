# Spese Caldaia

Monorepo for a boiler-expense management app with Supabase auth/data, an Express API, and a React frontend.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Redux Toolkit Query + Ant Design + Tailwind CSS
- **Backend API**: Node.js + Express + Supabase JS
- **Database/Auth**: Supabase (local dev via Supabase CLI)

## Core Features

- Authentication with Supabase (`username/password` and QR login flow)
- Organization-scoped data access
- Boiler accounting workflows:
  - utility bills (`Bollette`)
  - yearly prices/settings (`Prezzi`)
  - counters and readings (`Contattori`)
  - expenses (`Spese`)
  - calculation and transfer totals (`Calcolo`, `Bonifico`)
  - statistics and print report (`Statistica`, `Stampa Report`)

## Repository Structure

```text
/
├── backend/                # Express API + Supabase config/migrations/scripts
│   ├── routes/             # API endpoints
│   ├── lib/                # Supabase/auth helpers
│   └── supabase/           # Local Supabase config, migrations, seed
├── frontend/               # React app (Vite)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── store/
│       └── contexts/
└── README.md
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm
- Supabase CLI (`npx supabase` is used in commands below)

## Local Setup

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Start local Supabase

```bash
cd backend
npx supabase start
```

After startup, copy API URL and keys from:

```bash
npx supabase status
```

### 3) Configure environment variables

Create `backend/.env`:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_supabase_status>
SUPABASE_ANON_KEY=<anon_key_from_supabase_status>
PROD_FRONTEND_URL=http://localhost:5173
QR_AUTH_SECRET=<long_random_secret>
PORT=3001
NODE_ENV=development
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon_key_from_supabase_status>
```

### 4) Run backend and frontend

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/health`
- Supabase Studio: `http://127.0.0.1:54323`

## Useful Commands

Backend (`backend/`):

- `npm run dev` - start API with file watch
- `npm run start` - start API without watch
- `npm run seed-readings` - seed meter readings data
- `npm run generate-qr-codes` - generate QR login payloads/links
- `npx supabase start|stop|status` - manage local Supabase

Frontend (`frontend/`):

- `npm run dev` - run Vite dev server
- `npm run build` - type-check and build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Notes

- Auth data lives in `auth.users`; app profile data lives in `public.users`.
- The backend enforces organization-level access checks before serving data.
- Deployments are typically built from `frontend/` (see root `vercel.json`).
