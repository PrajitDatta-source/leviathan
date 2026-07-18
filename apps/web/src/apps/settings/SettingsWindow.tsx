"use client";

export function SettingsWindow() {
  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <p className="mt-2 text-zinc-400">
        Leviathan system settings.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4">

        <button className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-left transition hover:bg-zinc-700">
          Appearance
        </button>

        <button className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-left transition hover:bg-zinc-700">
          Wallpaper
        </button>

        <button className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-left transition hover:bg-zinc-700">
          Account
        </button>

        <button className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-left transition hover:bg-zinc-700">
          System
        </button>

      </div>
    </div>
  );
}