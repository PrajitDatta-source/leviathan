import { getSupabase, checkSupabaseConfig } from "@/lib/supabaseClient";

/**
 * Iris's server-side persistence layer for settings and the virtual
 * filesystem — backed by a simple `app_state` key/value table in Supabase
 * (see apps/web/supabase/schema_app_state.sql).
 *
 * This used to be a local iris_db.json file. That worked for local dev but
 * silently broke in production: Vercel's filesystem is read-only outside
 * /tmp and wiped on every redeploy/cold start, so every setting (including
 * your theme) reset itself constantly. That's the actual root cause of
 * "it doesn't remember the theme I left it on" — nothing was wrong with
 * theme selection itself, the file it was saved to just never survived.
 *
 * Credentials (Gmail tokens, Telegram token, etc.) do NOT live here — they
 * go through the encrypted, PIN-gated vault in lib/vault.ts instead, kept
 * deliberately separate from plain settings.
 */

export interface VFSNodeRecord {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  content?: string;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBData {
  vfsNodes: VFSNodeRecord[];
  preferences: {
    theme: string;
    wallpaper: string;
    notifications: boolean;
    autoSync: boolean;
    customWallpapers?: string[];
  };
}

const DEFAULT_DB: DBData = {
  vfsNodes: [],
  preferences: {
    theme: "windows11",
    wallpaper: "linear-gradient(135deg, #09090b 0%, #020205 100%)",
    notifications: true,
    autoSync: true,
    customWallpapers: [],
  },
};

/** True when Supabase is configured and this adapter's writes will
 * actually survive a redeploy. False falls back to in-memory defaults
 * every request — still lets the app boot and work for a session, but
 * nothing persists, which /api/system surfaces clearly. */
export const isPersistent = checkSupabaseConfig().ok;

// In-memory fallback only used when Supabase isn't configured, so local
// dev without any env vars set still boots instead of crashing.
let memoryDB: DBData = { ...DEFAULT_DB };

async function readRow<T>(key: string, fallback: T): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("app_state").select("value").eq("key", key).maybeSingle();
  if (error) {
    console.error(`Failed to read app_state[${key}]:`, error);
    return fallback;
  }
  return (data?.value as T) ?? fallback;
}

async function writeRow(key: string, value: unknown): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("app_state").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) {
    console.error(`Failed to write app_state[${key}]:`, error);
    throw error;
  }
}

export async function readDB(): Promise<DBData> {
  if (!isPersistent) return memoryDB;

  try {
    const [preferences, vfsNodes] = await Promise.all([
      readRow("preferences", DEFAULT_DB.preferences),
      readRow("vfsNodes", DEFAULT_DB.vfsNodes),
    ]);
    return { preferences: { ...DEFAULT_DB.preferences, ...preferences }, vfsNodes };
  } catch (e) {
    console.error("readDB failed, falling back to defaults:", e);
    return DEFAULT_DB;
  }
}

export async function writeDB(data: Partial<DBData>): Promise<DBData> {
  if (!isPersistent) {
    memoryDB = {
      ...memoryDB,
      ...data,
      preferences: data.preferences ? { ...memoryDB.preferences, ...data.preferences } : memoryDB.preferences,
    };
    return memoryDB;
  }

  const current = await readDB();
  const updated: DBData = {
    ...current,
    ...data,
    preferences: data.preferences ? { ...current.preferences, ...data.preferences } : current.preferences,
  };

  const writes: Promise<void>[] = [];
  if (data.preferences) writes.push(writeRow("preferences", updated.preferences));
  if (data.vfsNodes) writes.push(writeRow("vfsNodes", updated.vfsNodes));
  await Promise.all(writes);

  return updated;
}
