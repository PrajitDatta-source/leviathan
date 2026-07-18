"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { Theme } from "@/modules/theme/types";
import { Plus, Trash2 } from "lucide-react";

type Tab = "appearance" | "wallpaper" | "system";

const WALLPAPER_PRESETS = [
  {
    name: "Deep Space",
    value: "linear-gradient(135deg, #09090b 0%, #020205 100%)",
    preview: "from-zinc-900 to-black",
  },
  {
    name: "Nebula Mesh",
    value: "linear-gradient(135deg, #1e1b4b 0%, #030712 100%)",
    preview: "from-indigo-950 to-gray-950",
  },
  {
    name: "OLED Black",
    value: "#000000",
    preview: "bg-black",
  },
  {
    name: "Forest Dusk",
    value: "linear-gradient(135deg, #064e3b 0%, #022c22 0.01%, #030712 100%)",
    preview: "from-emerald-950 to-gray-950",
  },
  {
    name: "Sunset Mesh",
    value: "linear-gradient(135deg, #581c87 0%, #030712 100%)",
    preview: "from-purple-950 to-gray-950",
  },
];

export function SettingsWindow() {
  const { theme, setTheme, wallpaper, setWallpaper } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("appearance");
  const [customWallpapers, setCustomWallpapers] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leviathan_custom_wallpapers");
      if (stored) {
        setCustomWallpapers(JSON.parse(stored));
      }
    }
  }, []);

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUri = event.target?.result as string;
        const updated = [...customWallpapers, dataUri];
        setCustomWallpapers(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("leviathan_custom_wallpapers", JSON.stringify(updated));
        }
        setWallpaper(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteCustomWallpaper = (wpVal: string) => {
    const updated = customWallpapers.filter((w) => w !== wpVal);
    setCustomWallpapers(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("leviathan_custom_wallpapers", JSON.stringify(updated));
    }
    if (wallpaper === wpVal) {
      setWallpaper(WALLPAPER_PRESETS[0].value);
    }
  };

  return (
    <div className="flex h-full text-[var(--text)] select-none">
      {/* Sidebar */}
      <div className="w-[180px] border-r border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-1 shrink-0">
        <h2 className="text-xs font-semibold text-[var(--muted)] px-3 mb-3 uppercase tracking-wider">
          Settings
        </h2>
        
        <button
          onClick={() => setActiveTab("appearance")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "appearance"
              ? "bg-[var(--border)] font-medium"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Appearance
        </button>

        <button
          onClick={() => setActiveTab("wallpaper")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "wallpaper"
              ? "bg-[var(--border)] font-medium"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Wallpaper
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "system"
              ? "bg-[var(--border)] font-medium"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          System Info
        </button>
      </div>

      {/* Content pane */}
      <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
        {activeTab === "appearance" && (
          <div>
            <h3 className="text-lg font-medium mb-1">Color Theme</h3>
            <p className="text-xs text-[var(--muted)] mb-6">
              Customize the system coloring of Leviathan windows and overlays.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {([
                { id: "dark", label: "Dark Mode", desc: "Sleek carbon style" },
                { id: "light", label: "Light Mode", desc: "Clean & high contrast" },
                { id: "oled", label: "OLED Black", desc: "Pure deep blacks" },
                { id: "glass", label: "Glassmorphism", desc: "Translucent frosted sheets" },
                { id: "nord", label: "Nord", desc: "Cool arctic frost colors" },
                { id: "catppuccin", label: "Catppuccin Mocha", desc: "Soothing pastel tones" },
                { id: "tokyonight", label: "Tokyo Night", desc: "Vibrant neon cyberpunk" },
                { id: "dracula", label: "Dracula", desc: "Classic dark vampire palette" },
                { id: "gruvbox", label: "Gruvbox Dark", desc: "Retro warm sand & rust" },
              ] as { id: Theme; label: string; desc: string }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative p-4 rounded-xl border text-left transition ${
                    theme === t.id
                      ? "border-violet-500 bg-violet-500/5"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80"
                  }`}
                >
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{t.desc}</div>
                  {theme === t.id && (
                    <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-violet-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "wallpaper" && (
          <div>
            <h3 className="text-lg font-medium mb-1">Desktop Wallpaper</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Choose a color gradient or upload custom image files to personalize your workspace.
            </p>

            {/* Upload Input */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="wallpaper-upload-btn"
              onChange={handleCustomWallpaperUpload}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Upload Image trigger */}
              <label
                htmlFor="wallpaper-upload-btn"
                className="border border-[var(--border)] border-dashed hover:border-violet-500 rounded-xl h-[100px] flex flex-col items-center justify-center cursor-pointer transition text-xs text-[var(--muted)] hover:text-violet-400 gap-1.5 bg-[var(--surface)]/30"
              >
                <Plus className="w-5 h-5 text-violet-400" />
                <span>Upload Image File</span>
              </label>

              {/* Preset Wallpapers */}
              {WALLPAPER_PRESETS.map((wp) => {
                const isActive = wallpaper === wp.value;
                return (
                  <button
                    key={wp.name}
                    onClick={() => setWallpaper(wp.value)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition flex flex-col h-[100px] ${
                      isActive
                        ? "border-violet-500 shadow-lg"
                        : "border-[var(--border)] hover:border-[var(--border)]/80"
                    }`}
                  >
                    <div
                      className={`w-full flex-1 bg-gradient-to-br ${wp.preview}`}
                      style={
                        !wp.preview.startsWith("from-") && !wp.preview.startsWith("bg-")
                          ? { background: wp.value }
                          : {}
                      }
                    />
                    <div className="w-full bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-t border-[var(--border)] flex justify-between items-center">
                      <span>{wp.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Custom Uploaded Wallpapers */}
              {customWallpapers.map((wp, index) => {
                const isActive = wallpaper === wp;
                return (
                  <div
                    key={index}
                    onClick={() => setWallpaper(wp)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition flex flex-col h-[100px] cursor-pointer ${
                      isActive
                        ? "border-violet-500 shadow-lg"
                        : "border-[var(--border)] hover:border-[var(--border)]/80"
                    }`}
                  >
                    {/* Delete wallpaper button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCustomWallpaper(wp);
                      }}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors duration-150 z-10"
                      title="Delete custom wallpaper"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <div
                      className="w-full flex-1 bg-center bg-cover bg-no-repeat"
                      style={{ backgroundImage: `url(${wp})` }}
                    />
                    <div className="w-full bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-t border-[var(--border)] flex justify-between items-center">
                      <span className="truncate">Custom {index + 1}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div>
            <h3 className="text-lg font-medium mb-1">System Information</h3>
            <p className="text-xs text-[var(--muted)] mb-6">
              Platform status and environment configurations.
            </p>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] text-sm">
              <div className="flex justify-between p-3.5">
                <span className="text-[var(--muted)]">OS Name</span>
                <span className="font-medium">Leviathan OS</span>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-[var(--muted)]">Core Kernel</span>
                <span className="font-mono text-xs">v1.2.0-alpha (Next.js 16)</span>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-[var(--muted)]">Window System</span>
                <span className="font-medium">OS Window Manager (Single Truth Model)</span>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-[var(--muted)]">Environment</span>
                <span className="font-mono text-xs">Development (Localhost)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}