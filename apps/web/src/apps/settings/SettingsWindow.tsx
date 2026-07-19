"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { Theme } from "@/modules/theme/types";
import { Plus, Trash2, Keyboard, RotateCcw, Edit2 } from "lucide-react";
import { useIconTheme, type IconTheme } from "@/modules/icons/IconThemeContext";
import {
  SHORTCUT_DEFS,
  loadShortcutsConfig,
  saveShortcutsConfig,
  getShortcutCombination,
  formatKeyCombo,
  GlobalModifier,
  KeyCombination,
} from "@/core/window/shortcuts";

type Tab = "appearance" | "wallpaper" | "accounts" | "api" | "system" | "shortcuts";

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
  const { 
    theme, 
    setTheme, 
    wallpaper, 
    setWallpaper, 
    customWallpapers, 
    addCustomWallpaper, 
    deleteCustomWallpaper 
  } = useTheme();
  const { iconTheme, setIconTheme } = useIconTheme();
  const [activeTab, setActiveTab] = useState<Tab>("appearance");
  
  const [shortcutsConfig, setShortcutsConfig] = useState(() => loadShortcutsConfig());
  const [recordingId, setRecordingId] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecordingId(null);
        return;
      }

      const modifierKeys = ["control", "shift", "alt", "meta"];
      const keyName = e.key.toLowerCase();
      if (modifierKeys.includes(keyName)) {
        return;
      }

      let key = keyName;
      if (e.key === "ArrowUp") key = "arrowup";
      if (e.key === "ArrowDown") key = "arrowdown";
      if (e.key === "ArrowLeft") key = "arrowleft";
      if (e.key === "ArrowRight") key = "arrowright";

      const newCombo = {
        key: key,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      };

      const updatedConfig = {
        ...shortcutsConfig,
        globalModifier: "custom" as const,
        customBinds: {
          ...shortcutsConfig.customBinds,
          [recordingId]: newCombo,
        },
      };

      setShortcutsConfig(updatedConfig);
      saveShortcutsConfig(updatedConfig);
      setRecordingId(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recordingId, shortcutsConfig]);

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUri = event.target?.result as string;
        addCustomWallpaper(dataUri);
      };
      reader.readAsDataURL(file);
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
          onClick={() => setActiveTab("accounts")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "accounts"
              ? "bg-[var(--border)] font-medium"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Connected Accounts
        </button>

        <button
          onClick={() => setActiveTab("api")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "api"
              ? "bg-[var(--border)] font-medium"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          API Key Settings
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

        <button
          onClick={() => setActiveTab("shortcuts")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "shortcuts"
              ? "bg-[var(--border)] font-medium"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Keyboard Shortcuts
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
                { id: "leviathan-dark", label: "Leviathan Dark (Default)", desc: "Modern flat icons, synthetic click sounds, and dark walls" },
                { id: "leviathan-light", label: "Leviathan Light", desc: "Clean bright look with modern flat icons & click sounds" },
                { id: "fluent-glass", label: "Glass Fluent", desc: "Frosted glass-morphism panels and glowing neon fluent icons" },
                { id: "retro-mac", label: "Retro Macintosh", desc: "Monochrome gray style with pixel icons and pixel crosshair cursor" },
                { id: "material-design", label: "Material Design", desc: "Material theme with circular solid icons & flat dark card styling" },
                { id: "dark", label: "Legacy Dark", desc: "Sleek dark carbon style fallback" },
                { id: "light", label: "Legacy Light", desc: "Standard light contrast fallback" },
                { id: "oled", label: "OLED Black", desc: "Pure deep blacks fallback" },
                { id: "glass", label: "Frosted Glass", desc: "Standard frosted sheet fallback" },
              ] as { id: Theme; label: string; desc: string }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative p-4 rounded-xl border text-left transition cursor-pointer ${
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

            {/* Icon Themes */}
            <h3 className="text-lg font-medium mb-1 mt-8">Icon Theme</h3>
            <p className="text-xs text-[var(--muted)] mb-6">
              Select a system icon pack theme.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {([
                { id: "windows11", label: "Windows 11 (Fluent 3D)", desc: "Modern glossy rounded depth cogs" },
                { id: "windows7", label: "Windows 7 / Aero", desc: "Classic Aero glass reflections" },
                { id: "kde", label: "KDE Breeze", desc: "Clean geometric flat shapes" },
                { id: "macos", label: "macOS Big Sur", desc: "Chunky squircle containers" },
                { id: "papirus", label: "Papirus", desc: "Circular bold flat icons" },
              ] as { id: IconTheme; label: string; desc: string }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setIconTheme(t.id)}
                  className={`relative p-4 rounded-xl border text-left transition ${
                    iconTheme === t.id
                      ? "border-violet-500 bg-violet-500/5"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80"
                  }`}
                >
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{t.desc}</div>
                  {iconTheme === t.id && (
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

        {activeTab === "accounts" && (
          <div>
            <h3 className="text-lg font-medium mb-1">Connected Accounts</h3>
            <p className="text-xs text-[var(--muted)] mb-6">
              Authorize external connector channels for system notifications and calendar synchronizations.
            </p>

            <div className="space-y-4">
              {([
                { provider: "Google Calendar & Mail", desc: "Access inbox messages and calendar schedules", linked: true, user: "Prajit Datta (OAuth Active)" },
                { provider: "Telegram Connector", desc: "Interact with Leviathan secure chat nodes", linked: true, user: "@prajit_leviathan" },
                { provider: "GitHub Integration", desc: "Monitor active issue milestones and commits", linked: false, user: null },
                { provider: "Spotify Web Playback", desc: "Stream media details directly to taskbar tray", linked: false, user: null }
              ]).map((acc, index) => (
                <div key={index} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-sm text-zinc-100">{acc.provider}</div>
                    <div className="text-[var(--muted)] mt-0.5">{acc.desc}</div>
                    {acc.linked && <div className="text-[10px] text-emerald-400 font-semibold mt-1">✓ Linked as {acc.user}</div>}
                  </div>
                  <button className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    acc.linked ? "bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--text)]" : "bg-violet-600 hover:bg-violet-700 text-white"
                  }`}>
                    {acc.linked ? "Disconnect" : "Connect Account"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div>
            <h3 className="text-lg font-medium mb-1">API Key Management</h3>
            <p className="text-xs text-[var(--muted)] mb-6">
              Input private API credentials for Gemini, OpenAI and Anthropic services. Keys are safely sandboxed locally.
            </p>

            <div className="space-y-4 max-w-md text-xs">
              <div>
                <label className="block font-semibold text-[var(--muted)] mb-1.5">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  defaultValue="••••••••••••••••••••••••"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none text-zinc-200 placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--muted)] mb-1.5">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  defaultValue="••••••••••••••••••••••••"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none text-zinc-200 placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--muted)] mb-1.5">Anthropic API Key</label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none text-zinc-200 placeholder-zinc-600"
                />
              </div>
              <button
                onClick={() => alert("Secure API credentials saved successfully to sandbox storage.")}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition"
              >
                Save API Settings
              </button>
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

        {activeTab === "shortcuts" && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
              <button
                onClick={() => {
                  const defaultConfig = { globalModifier: "alt" as const, customBinds: {} };
                  setShortcutsConfig(defaultConfig);
                  saveShortcutsConfig(defaultConfig);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--border)] hover:bg-[var(--border)]/80 text-xs font-semibold rounded-lg transition text-zinc-300 cursor-pointer"
                title="Reset all shortcuts to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mb-6">
              Customize the keyboard shortcuts to manage windows, navigation, workspaces, and launch applications.
            </p>

            {/* Quick Reference Cheat Sheet */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider pl-1 mb-2">
                Quick Cheat Sheet (OS Defaults)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-xs">
                <div className="flex justify-between items-center bg-[var(--background)] px-3 py-2 rounded-lg border border-[var(--border)]/65">
                  <span className="text-zinc-400">Close Window</span>
                  <kbd className="font-mono bg-[var(--border)] px-1.5 py-0.5 rounded text-violet-400 font-semibold">Alt + Q</kbd>
                </div>
                <div className="flex justify-between items-center bg-[var(--background)] px-3 py-2 rounded-lg border border-[var(--border)]/65">
                  <span className="text-zinc-400">Max / Restore</span>
                  <kbd className="font-mono bg-[var(--border)] px-1.5 py-0.5 rounded text-violet-400 font-semibold">Alt + F</kbd>
                </div>
                <div className="flex justify-between items-center bg-[var(--background)] px-3 py-2 rounded-lg border border-[var(--border)]/65">
                  <span className="text-zinc-400">Minimize</span>
                  <kbd className="font-mono bg-[var(--border)] px-1.5 py-0.5 rounded text-violet-400 font-semibold">Alt + M</kbd>
                </div>
                <div className="flex justify-between items-center bg-[var(--background)] px-3 py-2 rounded-lg border border-[var(--border)]/65">
                  <span className="text-zinc-400">Show Desktop</span>
                  <kbd className="font-mono bg-[var(--border)] px-1.5 py-0.5 rounded text-violet-400 font-semibold">Alt + D</kbd>
                </div>
                <div className="flex justify-between items-center bg-[var(--background)] px-3 py-2 rounded-lg border border-[var(--border)]/65">
                  <span className="text-zinc-400">Cycle Windows</span>
                  <kbd className="font-mono bg-[var(--border)] px-1.5 py-0.5 rounded text-violet-400 font-semibold">Alt + Tab</kbd>
                </div>
                <div className="flex justify-between items-center bg-[var(--background)] px-3 py-2 rounded-lg border border-[var(--border)]/65">
                  <span className="text-zinc-400">Workspaces</span>
                  <kbd className="font-mono bg-[var(--border)] px-1.5 py-0.5 rounded text-violet-400 font-semibold">Alt + 1-9</kbd>
                </div>
              </div>
            </div>

            {/* Global Modifier Selector */}
            <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
              <div className="font-semibold text-sm text-zinc-100 mb-1">Global Modifier Key</div>
              <p className="text-[11px] text-[var(--muted)] mb-3.5">
                Quickly switch the base modifier key for all default shortcuts. Ideal if your browser or operating system intercepts the "Super" (Windows/Command) key.
              </p>
              <div className="flex gap-2">
                {([
                  { id: "meta", label: "Super (Win/Cmd)" },
                  { id: "alt", label: "Alt (Option)" },
                  { id: "ctrl", label: "Ctrl" },
                  { id: "custom", label: "Custom (Individual)" }
                ] as { id: GlobalModifier; label: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      const updated = { ...shortcutsConfig, globalModifier: opt.id };
                      setShortcutsConfig(updated);
                      saveShortcutsConfig(updated);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      shortcutsConfig.globalModifier === opt.id
                        ? "bg-violet-600 text-white"
                        : "bg-[var(--border)] hover:bg-[var(--border)]/80 text-zinc-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shortcuts List grouped by Category */}
            <div className="space-y-6">
              {Array.from(new Set(SHORTCUT_DEFS.map(d => d.category))).map((category) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider pl-1 mb-2">
                    {category}
                  </h4>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
                    {SHORTCUT_DEFS.filter(d => d.category === category).map((def) => {
                      const combo = getShortcutCombination(def.id, shortcutsConfig);
                      const isCustom = !!shortcutsConfig.customBinds[def.id];
                      return (
                        <div key={def.id} className="flex justify-between items-center p-3 text-xs">
                          <div>
                            <div className="font-medium text-zinc-200">{def.name}</div>
                            {isCustom && <div className="text-[9px] text-violet-400 font-medium mt-0.5">Customized</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono bg-[var(--background)] px-2 py-1 border border-[var(--border)] rounded text-[var(--text)] text-[11px] font-medium shadow-sm">
                              {formatKeyCombo(combo)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setRecordingId(def.id)}
                                className="p-1 rounded bg-[var(--border)]/60 hover:bg-[var(--border)] text-zinc-300 transition cursor-pointer"
                                title="Change shortcut"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isCustom && (
                                <button
                                  onClick={() => {
                                    const updatedBinds = { ...shortcutsConfig.customBinds };
                                    delete updatedBinds[def.id];
                                    const updated = { ...shortcutsConfig, customBinds: updatedBinds };
                                    setShortcutsConfig(updated);
                                    saveShortcutsConfig(updated);
                                  }}
                                  className="p-1 rounded bg-[var(--border)]/60 hover:bg-red-950/40 hover:text-red-400 text-zinc-400 transition cursor-pointer"
                                  title="Reset to default"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Recording Overlay Modal */}
            {recordingId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 w-[340px] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex justify-center mb-3">
                    <Keyboard className="w-8 h-8 text-violet-500 animate-pulse" />
                  </div>
                  <h4 className="font-semibold text-zinc-100 text-base mb-1">Recording Keybind</h4>
                  <p className="text-xs text-[var(--muted)] mb-4">
                    Press any key combination on your keyboard to assign to:
                  </p>
                  <div className="font-medium text-violet-400 py-2.5 px-4 bg-[var(--background)] rounded-lg mb-4 text-xs font-mono border border-violet-500/20 truncate">
                    {SHORTCUT_DEFS.find(d => d.id === recordingId)?.name}
                  </div>
                  <div className="text-[10px] text-[var(--muted)] space-y-1 mb-2">
                    <p>Press <span className="font-mono bg-[var(--border)] px-1 rounded">Escape</span> to cancel.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}