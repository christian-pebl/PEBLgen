-- Additional Backup Tables
-- These tables store data that was missing from the original backup system

-- ============================================
-- TABLE 1: User Preferences
-- ============================================
-- Stores user settings and preferences (dark mode, table settings, UI state, etc.)

CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(user_id, preference_key);

COMMENT ON TABLE user_preferences IS 'Stores user settings and preferences (dark mode, table settings, UI state, payslip mappings)';

-- ============================================
-- TABLE 2: Keyword Aliases
-- ============================================
-- Stores user-defined transaction categorization rules

CREATE TABLE IF NOT EXISTS keyword_aliases (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    aliases_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE keyword_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keyword aliases"
    ON keyword_aliases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keyword aliases"
    ON keyword_aliases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own keyword aliases"
    ON keyword_aliases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own keyword aliases"
    ON keyword_aliases FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_keyword_aliases_user_id ON keyword_aliases(user_id);

COMMENT ON TABLE keyword_aliases IS 'User-defined transaction categorization rules (spend.html)';

-- ============================================
-- TABLE 3: Gmail Accounts
-- ============================================
-- Stores Gmail account information (WITHOUT sensitive OAuth tokens)

CREATE TABLE IF NOT EXISTS gmail_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accounts JSONB NOT NULL, -- Array of {email, name}
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail accounts"
    ON gmail_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail accounts"
    ON gmail_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail accounts"
    ON gmail_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail accounts"
    ON gmail_accounts FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON gmail_accounts(user_id);

COMMENT ON TABLE gmail_accounts IS 'Connected Gmail accounts (email and name only, OAuth tokens NOT stored for security)';
