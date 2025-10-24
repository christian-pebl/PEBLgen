-- ============================================
-- PEBLGEN SUPABASE DATABASE SETUP
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste this entire file → Run
-- ============================================

-- STEP 1: Create Tables
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  project_number TEXT,
  budget_data JSONB DEFAULT '{}'::jsonb,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_name)
);

CREATE TABLE IF NOT EXISTS csv_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, file_name)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  transaction_index INTEGER,
  gmail_message_id TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, filename)
);

CREATE TABLE IF NOT EXISTS sketcher_csv_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  import_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, file_name)
);

CREATE TABLE IF NOT EXISTS gantt_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_data JSONB DEFAULT '{}'::jsonb,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_data JSONB DEFAULT '{}'::jsonb,
  entry_date DATE,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  last_modified TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sketcher_csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create RLS Policies
-- ============================================

-- Projects Policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- CSV Files Policies
CREATE POLICY "Users can view own csv files" ON csv_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own csv files" ON csv_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own csv files" ON csv_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own csv files" ON csv_files
  FOR DELETE USING (auth.uid() = user_id);

-- Invoices Policies
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Sketcher CSV Imports Policies
CREATE POLICY "Users can view own sketcher csvs" ON sketcher_csv_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sketcher csvs" ON sketcher_csv_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sketcher csvs" ON sketcher_csv_imports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sketcher csvs" ON sketcher_csv_imports
  FOR DELETE USING (auth.uid() = user_id);

-- Gantt Projects Policies
CREATE POLICY "Users can view own gantt projects" ON gantt_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gantt projects" ON gantt_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gantt projects" ON gantt_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gantt projects" ON gantt_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Timesheet Entries Policies
CREATE POLICY "Users can view own timesheet entries" ON timesheet_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timesheet entries" ON timesheet_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timesheet entries" ON timesheet_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timesheet entries" ON timesheet_entries
  FOR DELETE USING (auth.uid() = user_id);

-- User Preferences Policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STEP 4: Create Auto-Update Triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_modtime
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_gantt_projects_modtime
    BEFORE UPDATE ON gantt_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_timesheet_entries_modtime
    BEFORE UPDATE ON timesheet_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_preferences_modtime
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================
-- STEP 5: Create Storage Buckets
-- ============================================
-- NOTE: You need to create these buckets manually in the Storage section
-- OR run this SQL if you have the service_role key:

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('csv-files', 'csv-files', false),
  ('invoices', 'invoices', false),
  ('sketcher-csvs', 'sketcher-csvs', false),
  ('project-images', 'project-images', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 6: Create Storage Policies
-- ============================================

-- CSV Files Storage Policies
CREATE POLICY "Users can upload own csv files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'csv-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own csv files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'csv-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own csv files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'csv-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own csv files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'csv-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Invoices Storage Policies
CREATE POLICY "Users can upload own invoices" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own invoices" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own invoices" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own invoices" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Sketcher CSVs Storage Policies
CREATE POLICY "Users can upload own sketcher csvs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sketcher-csvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own sketcher csvs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sketcher-csvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own sketcher csvs" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sketcher-csvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own sketcher csvs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sketcher-csvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Project Images Storage Policies
CREATE POLICY "Users can upload own project images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own project images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own project images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own project images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- You should see "Success. No rows returned" if everything worked correctly.
-- Now refresh your PEBLGen app and the sync should work!
-- ============================================
