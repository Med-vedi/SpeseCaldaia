-- ============================================================================
-- Fix RLS Policy Infinite Recursion for users table
-- ============================================================================
-- The admin policies were causing infinite recursion because they query
-- the users table within the policy check, which triggers the same policy again.

-- IMPORTANT: Run this in Supabase SQL Editor to fix the infinite recursion error

-- Drop ALL existing policies to start fresh (this fixes the recursion)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view all active users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view active users" ON public.users;

-- Create simple, non-recursive policies
-- Policy 1: All authenticated users can view all users (simplest, no recursion)
-- This is safe because it only checks auth.uid(), not the users table
CREATE POLICY "All authenticated users can view users" ON public.users
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE
    USING (id = auth.uid());

