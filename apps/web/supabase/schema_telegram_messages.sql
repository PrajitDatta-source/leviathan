-- Run this in Supabase SQL Editor.
--
-- If you already ran schema_telegram_message_log.sql from the previous
-- version, run this instead to convert it into a permanent inbox table
-- (it was capped at 48h retention, meant only as a Ghost Vault lookup
-- cache — now it's also the source for the real, permanent Inbox tab):
--
--   ALTER TABLE telegram_message_log RENAME TO telegram_messages;
--
-- If you never ran that file, just run the CREATE TABLE below fresh.

CREATE TABLE IF NOT EXISTS telegram_messages (
  msg_id BIGINT PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow anon full access to telegram_messages" ON telegram_messages;
CREATE POLICY "allow anon full access to telegram_messages"
ON telegram_messages FOR ALL TO anon USING (true) WITH CHECK (true);
