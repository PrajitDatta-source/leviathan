-- Run this in Supabase SQL Editor. Backs the settings/VFS persistence
-- layer (core/backend/db.ts) so theme, wallpaper and your filesystem
-- survive Vercel redeploys instead of living in a file that gets wiped
-- every cold start.

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
