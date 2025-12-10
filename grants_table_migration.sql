-- =====================================================
-- GRANTS TABLE MIGRATION FOR CENTRALIZED DATA STORAGE
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This enables all pages to access grants data automatically

-- Create grants table
CREATE TABLE IF NOT EXISTS public.grants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    project_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_grants_user_id ON public.grants(user_id);
CREATE INDEX IF NOT EXISTS idx_grants_project_id ON public.grants(user_id, project_id);

-- Enable Row Level Security
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own grants" ON public.grants;
DROP POLICY IF EXISTS "Users can insert their own grants" ON public.grants;
DROP POLICY IF EXISTS "Users can update their own grants" ON public.grants;
DROP POLICY IF EXISTS "Users can delete their own grants" ON public.grants;

-- Create RLS policies
CREATE POLICY "Users can view their own grants"
    ON public.grants
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grants"
    ON public.grants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grants"
    ON public.grants
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grants"
    ON public.grants
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_grants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_grants_timestamp ON public.grants;
CREATE TRIGGER update_grants_timestamp
    BEFORE UPDATE ON public.grants
    FOR EACH ROW
    EXECUTE FUNCTION update_grants_updated_at();

-- Grant permissions
GRANT ALL ON public.grants TO authenticated;
GRANT ALL ON public.grants TO service_role;
