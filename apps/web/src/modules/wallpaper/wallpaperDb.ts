export interface CustomWallpaperItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

const DB_NAME = "iris_wallpaper_db";
const DB_VERSION = 1;
const STORE_NAME = "wallpapers";

export function openWallpaperDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveWallpaperToDb(item: CustomWallpaperItem): Promise<CustomWallpaperItem> {
  const db = await openWallpaperDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error || new Error("Failed to save wallpaper"));
  });
}

export async function getAllWallpapersFromDb(): Promise<CustomWallpaperItem[]> {
  try {
    const db = await openWallpaperDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as CustomWallpaperItem[]) || [];
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };

      request.onerror = () => reject(request.error || new Error("Failed to get wallpapers"));
    });
  } catch {
    return [];
  }
}

export async function deleteWallpaperFromDb(id: string): Promise<void> {
  const db = await openWallpaperDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to delete wallpaper"));
  });
}
