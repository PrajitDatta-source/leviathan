export interface CustomWallpaperItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

/**
 * This used to be an IndexedDB store — meaning a wallpaper you uploaded
 * was only ever visible on the exact browser/device you uploaded it from.
 * Now backed by Supabase (see /api/wallpapers and
 * supabase/schema_custom_wallpapers.sql) so it's the same everywhere,
 * matching how the rest of Iris's state (settings, VFS, vault) works.
 */

interface WallpaperRow {
  id: string;
  name: string;
  data_url: string;
  created_at: string;
}

export async function saveWallpaperToDb(item: CustomWallpaperItem): Promise<CustomWallpaperItem> {
  const res = await fetch("/api/wallpapers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: item.id, name: item.name, dataUrl: item.dataUrl }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to save wallpaper");
  }
  return item;
}

export async function getAllWallpapersFromDb(): Promise<CustomWallpaperItem[]> {
  try {
    const res = await fetch("/api/wallpapers");
    if (!res.ok) return [];
    const rows: WallpaperRow[] = await res.json();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      dataUrl: r.data_url,
      createdAt: new Date(r.created_at).getTime(),
    }));
  } catch {
    return [];
  }
}

export async function deleteWallpaperFromDb(id: string): Promise<void> {
  const res = await fetch(`/api/wallpapers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to delete wallpaper");
  }
}
