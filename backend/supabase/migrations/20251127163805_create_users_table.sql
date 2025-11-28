-- Create users table with custom fields
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    organization_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'guest', 'basic')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create index on username for faster lookups
CREATE INDEX idx_users_username ON public.users(username);

-- Create index on organization_id for filtering
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
