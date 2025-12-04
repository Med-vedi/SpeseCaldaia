import { createClient } from '@supabase/supabase-js'

// Get Supabase URL and key from environment variables
// Vite requires VITE_ prefix for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://szlrayqvddfxhrnwuccz.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bHJheXF2ZGRmeGhybnd1Y2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjAxNDEsImV4cCI6MjA3OTgzNjE0MX0.pRSjOnP-XcrMbzvzVPEyyh7J2ChtVuw5dtGcIqXRFKY'

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
