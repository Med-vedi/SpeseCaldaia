# Supabase Frontend Setup

This guide explains how to connect the frontend to your Supabase backend.

## 🔧 Configuration

### 1. Environment Variables

The frontend uses environment variables for Supabase configuration. Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Note:** Vite requires the `VITE_` prefix for environment variables to be exposed to the client.

### 2. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** > **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Update .env File

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values.

## 🚀 Running the Frontend

### Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy).

### Build for Production

```bash
npm run build
```

## ✅ Verify Connection

1. Start the frontend: `npm run dev`
2. Open the app in your browser
3. Check the browser console for any connection errors
4. Try logging in with one of your users:
   - `medvedivladislav@gmail.com` / `111111`
   - `dino@example.com` / `111111`
   - `cristian@example.com` / `111111`

## 🔍 Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists in the `frontend/` directory
- Check that variables start with `VITE_` prefix
- Restart the dev server after creating/updating `.env`

### "Failed to fetch" or CORS errors
- Check that your Supabase project URL is correct
- Verify the anon key is correct
- Check Supabase Dashboard > Settings > API for the correct values

### "Invalid API key"
- Make sure you're using the **anon/public** key, not the service_role key
- The anon key is safe to use in frontend code
- Never commit the service_role key to the frontend

### Environment variables not loading
- Vite requires server restart after `.env` changes
- Make sure variables start with `VITE_` prefix
- Check that `.env` is in the `frontend/` directory (not root)

## 📝 Current Configuration

The Supabase client is configured in `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## 🔐 Security Notes

- ✅ The **anon key** is safe to use in frontend code
- ❌ Never use the **service_role key** in frontend code
- ✅ Row Level Security (RLS) policies protect your data
- ✅ `.env` is in `.gitignore` to prevent committing secrets

## 🔄 Connecting to Different Environments

### Local Supabase (if using Supabase CLI)

If you're running Supabase locally:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Production Supabase

Use your production project URL and anon key from the Dashboard.

