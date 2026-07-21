import fs from "fs";
import path from "path";

/**
 * Iris's server-side persistence layer.
 *
 * This is a small JSON-file "database" — zero config, works out of the box
 * for local dev and self-hosting. It is intentionally written behind the
 * same shape a real database repository would have (typed schema, atomic
 * writes, one entry point) so swapping in Postgres/Neon/etc. later is a
 * localized change: replace the body of `readDB`/`writeDB` with real
 * queries and nothing that calls them needs to change.
 *
 * IMPORTANT — serverless deployments (Vercel, etc.): the filesystem there
 * is read-only outside of /tmp and is wiped on every cold start/deploy, so
 * this adapter's data will NOT persist in that environment. `isPersistent`
 * below reflects that. If you deploy Iris to a serverless platform, swap
 * this file for a real database adapter (see "Adding a real database"
 * below) — everything that imports `readDB`/`writeDB` stays unchanged.
 *
 * Adding a real database:
 *   1. Set DATABASE_URL in your environment (e.g. a Neon/Postgres URL).
 *   2. Implement `readDB`/`writeDB` against it (e.g. with `pg` or an ORM),
 *      keeping the same DBData shape below (or migrate it with a proper
 *      schema/migration tool).
 *   3. Everything in app/api/** keeps working unmodified, since it only
 *      ever calls readDB()/writeDB() from this file.
 */

const DB_FILE = path.join(process.cwd(), "iris_db.json");

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

export interface TelegramChatRecord {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
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
  telegramChats: TelegramChatRecord[];
}

const DEFAULT_DB: DBData = {
  vfsNodes: [],
  preferences: {
    theme: "iris-dark",
    wallpaper: "linear-gradient(135deg, #09090b 0%, #020205 100%)",
    notifications: true,
    autoSync: true,
    customWallpapers: [],
  },
  telegramChats: [
    {
      id: "tg_1",
      sender: "Telegram Bot",
      text: "Welcome to Iris OS Telegram integration! Secure connection established.",
      timestamp: new Date().toISOString(),
    },
    {
      id: "tg_2",
      sender: "Prajit (Owner)",
      text: "Is the server-side filesystem sync working?",
      timestamp: new Date().toISOString(),
    },
  ],
};

/** True when this adapter's writes will actually survive a restart. */
export const isPersistent = !process.env.VERCEL && !process.env.NOW_REGION;

function readDBFromDisk(): DBData {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDBToDisk(DEFAULT_DB);
      return DEFAULT_DB;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(content) as Partial<DBData>;
    // Merge over defaults so a DB file from an older schema (missing a
    // newly-added field) never crashes a reader that expects it to exist.
    return {
      vfsNodes: parsed.vfsNodes ?? DEFAULT_DB.vfsNodes,
      preferences: { ...DEFAULT_DB.preferences, ...parsed.preferences },
      telegramChats: parsed.telegramChats ?? DEFAULT_DB.telegramChats,
    };
  } catch (e) {
    console.error("Failed to read backend DB, falling back to defaults:", e);
    return DEFAULT_DB;
  }
}

function writeDBToDisk(data: DBData): void {
  // Atomic write: write to a temp file in the same directory, then rename
  // over the real file. A crash mid-write leaves the old file intact
  // instead of a truncated/corrupt JSON file that the next read would
  // silently fall back to defaults for.
  const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpFile, DB_FILE);
}

// Serialize writes within this process so concurrent API requests (e.g. a
// VFS sync and a Telegram POST landing in the same tick) read-modify-write
// in order instead of racing and silently dropping one of the updates.
// This does not protect against multiple server *processes/instances*
// writing at once — that needs a real database with real transactions.
let writeQueue: Promise<void> = Promise.resolve();

export function readDB(): DBData {
  return readDBFromDisk();
}

export function writeDB(data: Partial<DBData>): Promise<DBData> {
  const task = writeQueue.then(() => {
    const current = readDBFromDisk();
    const updated: DBData = {
      ...current,
      ...data,
      preferences: data.preferences
        ? { ...current.preferences, ...data.preferences }
        : current.preferences,
    };
    writeDBToDisk(updated);
    return updated;
  });

  // Keep the queue alive even if this particular write fails, so later
  // writes still get their turn instead of the whole queue jamming.
  writeQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}
