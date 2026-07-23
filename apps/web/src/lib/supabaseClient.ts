import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Single shared Supabase config for the whole app — the Telegram bridge,
 * the settings/VFS persistence layer, and the encrypted credential vault
 * all point at the same project through these two env vars. There used to
 * be two different hardcoded Supabase URL/anon-key pairs baked directly
 * into source (one here, one in the old lib/vault.ts) — that's both a
 * security problem (a real key committed to the repo) and a maintenance
 * problem (rotate the key in Supabase and half the app silently breaks).
 *
 * Required in your environment (Vercel → Settings → Environment Variables,
 * or .env.local for local dev):
 *
 *   NEXT_PUBLIC_SUPABASE_URL       e.g. https://xxxxxxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  the "anon" / "public" key from
 *                                  Supabase → Settings → API
 *
 * Common mistake: pasting the Project ID/ref (the "xxxxxxxx" part) instead
 * of the full URL. `isValidSupabaseUrl` below catches that case and
 * surfaces a clear error instead of a confusing network failure.
 */

export function getSupabaseEnv(): { url: string | undefined; anonKey: string | undefined } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export interface SupabaseConfigStatus {
  ok: boolean;
  reason?: string;
}

/** Human-readable diagnosis of the current Supabase env config, used by
 * /api/system and the Settings > Vault panel so misconfiguration shows up
 * as a clear message instead of a generic 500. */
export function checkSupabaseConfig(): SupabaseConfigStatus {
  const { url, anonKey } = getSupabaseEnv();

  if (!url && !anonKey) {
    return { ok: false, reason: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set." };
  }
  if (!url) {
    return { ok: false, reason: "NEXT_PUBLIC_SUPABASE_URL is not set." };
  }
  if (!anonKey) {
    return { ok: false, reason: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set." };
  }
  if (!isValidSupabaseUrl(url)) {
    return {
      ok: false,
      reason: `NEXT_PUBLIC_SUPABASE_URL is set to "${url}", which isn't a full Supabase URL. It needs to look like https://xxxxxxxx.supabase.co — not just the project ID/ref. Find it in Supabase → Settings → API → "Project URL".`,
    };
  }
  // A Supabase anon key is a JWT — three base64url segments separated by dots.
  if (anonKey.split(".").length !== 3) {
    return {
      ok: false,
      reason: 'NEXT_PUBLIC_SUPABASE_ANON_KEY doesn\'t look like a valid key (should be a long token with two "." characters in it, starting with "eyJ"). Find it in Supabase → Settings → API → "anon public" key.',
    };
  }
  return { ok: true };
}

let cachedClient: SupabaseClient | null = null;

/** Throws with a clear, actionable message if env vars are missing/malformed
 * instead of letting supabase-js fail with an opaque network error. */
export function getSupabase(): SupabaseClient {
  const status = checkSupabaseConfig();
  if (!status.ok) {
    throw new Error(`Supabase is not configured correctly: ${status.reason}`);
  }
  if (!cachedClient) {
    const { url, anonKey } = getSupabaseEnv();
    cachedClient = createClient(url as string, anonKey as string);
  }
  return cachedClient;
}
