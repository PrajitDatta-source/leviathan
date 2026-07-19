import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "iris_db.json");

export interface DBData {
  vfsNodes: any[];
  preferences: {
    theme: string;
    wallpaper: string;
    notifications: boolean;
    autoSync: boolean;
  };
  telegramChats: any[];
}

const DEFAULT_DB: DBData = {
  vfsNodes: [],
  preferences: {
    theme: "dark",
    wallpaper: "linear-gradient(135deg, #09090b 0%, #020205 100%)",
    notifications: true,
    autoSync: true,
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

export function readDB(): DBData {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
      return DEFAULT_DB;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content) as DBData;
  } catch (e) {
    console.error("Failed to read backend DB:", e);
    return DEFAULT_DB;
  }
}

export function writeDB(data: Partial<DBData>): void {
  try {
    const current = readDB();
    const updated = {
      ...current,
      ...data,
      preferences: data.preferences
        ? { ...current.preferences, ...data.preferences }
        : current.preferences,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write backend DB:", e);
  }
}
