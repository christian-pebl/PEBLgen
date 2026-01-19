-- Staff Signatures Table
-- Stores staff signature images for timesheet approval

CREATE TABLE IF NOT EXISTS staff_signatures (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    signature_image TEXT NOT NULL, -- Base64 data URL
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, staff_name)
);

-- Enable Row Level Security
ALTER TABLE staff_signatures ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own signatures
CREATE POLICY "Users can view own staff signatures"
    ON staff_signatures FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own signatures
CREATE POLICY "Users can insert own staff signatures"
    ON staff_signatures FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own signatures
CREATE POLICY "Users can update own staff signatures"
    ON staff_signatures FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own signatures
CREATE POLICY "Users can delete own staff signatures"
    ON staff_signatures FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_signatures_user_id ON staff_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_signatures_staff_name ON staff_signatures(user_id, staff_name);

-- Add comment
COMMENT ON TABLE staff_signatures IS 'Stores staff signature images for timesheet approval (timesheet.html)';
