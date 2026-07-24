-- Run this in Supabase SQL Editor.
--
-- Fixes the Ghost Vault mostly showing "Too old to recover text" instead
-- of actual deleted message content. That happened because the HF Space
-- only cached recent messages in RAM (a plain Python dict) — and that RAM
-- gets wiped every time the Space sleeps, restarts, or redeploys, which
-- happens often on the free tier. Any message deleted after a restart but
-- before this table existed had nothing to recover from. This table is a
-- durable version of that same cache, so a restart no longer loses it.

CREATE TABLE IF NOT EXISTS telegram_message_log (
  msg_id BIGINT PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telegram_message_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow anon full access to telegram_message_log" ON telegram_message_log;
CREATE POLICY "allow anon full access to telegram_message_log"
ON telegram_message_log FOR ALL TO anon USING (true) WITH CHECK (true);
