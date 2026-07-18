"use client";

import React, { useState } from "react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { Theme } from "@/modules/theme/types";

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
            <p className="text-xs text-[var(--muted)] mb-6">
              Choose a gradient or color preset for your desktop workspace.
            </p>

            <div className="grid grid-cols-2 gap-4">
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
                    {/* Background Preview */}
                    <div
                      className={`w-full flex-1 bg-gradient-to-br ${wp.preview}`}
                      style={
                        !wp.preview.startsWith("from-") && !wp.preview.startsWith("bg-")
                          ? { background: wp.value }
                          : {}
                      }
                    />
                    
                    {/* Footer */}
                    <div className="w-full bg-[var(--surface)] px-3 py-2 text-xs font-medium border-t border-[var(--border)] flex justify-between items-center">
                      <span>{wp.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      )}
                    </div>
                  </button>
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