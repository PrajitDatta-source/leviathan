-- Step 3: Add the Staging Table in Supabase
-- Run this SQL query inside your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS telegram_inbox (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  sender TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
