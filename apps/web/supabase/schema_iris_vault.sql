-- Run this in Supabase SQL Editor. Backs the encrypted credential vault
-- (lib/vault.ts) — the single row here holds your AES-encrypted Gmail/
-- Telegram credentials, theme, and VFS snapshot, unlockable with your PIN
-- from any device.

CREATE TABLE IF NOT EXISTS iris_vault (
  vault_id TEXT PRIMARY KEY,
  encrypted_data TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommended: lock this table down so only your app's anon key can read/
-- write the one row it needs, nothing more. Enable RLS and add a policy
-- like this (adjust to taste — Supabase's anon key can't be fully hidden
-- from a client-side app, so the encryption is what actually protects the
-- contents, but RLS still limits blast radius / stops table enumeration):
--
-- ALTER TABLE iris_vault ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow anon full access to iris_vault"
--   ON iris_vault FOR ALL
--   USING (true)
--   WITH CHECK (true);
