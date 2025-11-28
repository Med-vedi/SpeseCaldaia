import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://szlrayqvddfxhrnwuccz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bHJheXF2ZGRmeGhybnd1Y2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjAxNDEsImV4cCI6MjA3OTgzNjE0MX0.pRSjOnP-XcrMbzvzVPEyyh7J2ChtVuw5dtGcIqXRFKY'

export const supabase = createClient(supabaseUrl, supabaseKey)
