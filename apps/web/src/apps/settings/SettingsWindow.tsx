export function SettingsWindow() {
  return (
    <div className="h-full p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="mt-6 space-y-3">
        <button className="w-full rounded bg-zinc-800 p-3 text-left hover:bg-zinc-700">
          Appearance
        </button>

        <button className="w-full rounded bg-zinc-800 p-3 text-left hover:bg-zinc-700">
          Theme
        </button>

        <button className="w-full rounded bg-zinc-800 p-3 text-left hover:bg-zinc-700">
          Wallpaper
        </button>
      </div>
    </div>
  );
}