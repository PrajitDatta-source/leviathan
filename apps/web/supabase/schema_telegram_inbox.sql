-- Step 3: Add the Staging Table in Supabase
-- Run this SQL query inside your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS telegram_inbox (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL, -- 'TG_DMS', 'TG_GHOST_EDIT', 'TG_GHOST_DELETE'
    sender TEXT NOT NULL,
    payload TEXT NOT NULL,
    is_ghost BOOLEAN DEFAULT FALSE, -- Flag to easily filter deleted/unsent texts
    created_at TIMESTAMPTZ DEFAULT NOW()
);
