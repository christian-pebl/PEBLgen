-- ============================================
-- LABOUR ALLOCATION CLOUD BACKUP
-- ============================================
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- Create labour_allocation table
CREATE TABLE IF NOT EXISTS labour_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  allocation_data JSONB DEFAULT '{}'::jsonb,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE labour_allocation ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own labour allocation" ON labour_allocation
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own labour allocation" ON labour_allocation
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labour allocation" ON labour_allocation
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own labour allocation" ON labour_allocation
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update trigger for last_modified
CREATE TRIGGER update_labour_allocation_modtime
    BEFORE UPDATE ON labour_allocation
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Next step: Update timesheet.html to use this table
-- ============================================
