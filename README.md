# Spese Caldaia

Monorepo for a boiler-expense management app with Neon Postgres, an Express API, and a React frontend.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Redux Toolkit Query + Ant Design + Tailwind CSS
- **Backend API**: Node.js + Express + `pg`
- **Database**: Neon Postgres
- **Auth**: custom JWT (`jsonwebtoken`) + bcrypt, implemented in `backend/lib/`

## Core Features

- Authentication (`username/password` and QR login flow)
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
├── backend/                # Express API
│   ├── routes/             # API endpoints
│   ├── lib/                # DB pool, JWT, password hashing, QR auth, org access
│   ├── middleware/         # Shared auth middleware
│   └── migrations/         # node-pg-migrate schema migrations
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
- A Neon Postgres project (or any Postgres instance)

## Local Setup

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configure environment variables

Create `backend/.env`:

```env
DATABASE_URL=<your Neon connection string>
JWT_SECRET=<a long random secret>
JWT_EXPIRES_IN=7d
PROD_FRONTEND_URL=http://localhost:5173
QR_AUTH_SECRET=<a long random secret>
PORT=3001
NODE_ENV=development
```

Create `frontend/.env` (only needed if the API isn't on the default `http://localhost:3001/api`):

```env
VITE_API_URL=http://localhost:3001/api
```

### 3) Run the schema migration

```bash
cd backend
npm run migrate:up
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

## Useful Commands

Backend (`backend/`):

- `npm run dev` - start API with file watch
- `npm run start` - start API without watch
- `npm run migrate:up` - apply pending schema migrations
- `npm run seed-readings` - seed meter readings data
- `npm run generate-qr-codes` - generate QR login payloads/links

Frontend (`frontend/`):

- `npm run dev` - run Vite dev server
- `npm run build` - type-check and build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Notes

- Auth and profile data both live in `public.users` (see `backend/ARCHITECTURE.md`) — passwords are bcrypt hashes, sessions are stateless JWTs.
- The backend enforces organization-level access checks in application code (`backend/lib/orgAccess.js`); there is no database-level RLS.
- Deployments are typically built from `frontend/` (see root `vercel.json`).
