-- Run this in Supabase SQL Editor. Replaces the old IndexedDB-based
-- wallpaper storage (modules/wallpaper/wallpaperDb.ts), which was
-- device-local only — a wallpaper you uploaded on one device never showed
-- up anywhere else. This table is what makes "upload once, use forever,
-- on any device" actually true.

CREATE TABLE IF NOT EXISTS custom_wallpapers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
