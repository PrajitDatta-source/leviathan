"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { Plus, Trash2, Keyboard, RotateCcw, Edit2, Check, Lock } from "lucide-react";
import DiskUtility from "@/components/os/DiskUtility";
import { autoSyncToCloud, verifyCloudContent, revokeServiceAuth } from "@/lib/vault";
import { useThemeStore, OSStyle } from "@/modules/theme/useThemeStore";
import { themePresets } from "@/modules/theme/presets";
import { Theme } from "@/modules/theme/types";
import { useIconTheme, iconPackRegistry } from "@/modules/icons/IconThemeContext";
import {
  saveWallpaperToDb,
  getAllWallpapersFromDb,
  deleteWallpaperFromDb,
  CustomWallpaperItem,
} from "@/modules/wallpaper/wallpaperDb";
import {
  SHORTCUT_DEFS,
  loadShortcutsConfig,
  saveShortcutsConfig,
  getShortcutCombination,
  formatKeyCombo,
  GlobalModifier,
} from "@/core/window/shortcuts";

type Tab = "appearance" | "wallpaper" | "accounts" | "api" | "vault" | "cloud-vault" | "system" | "shortcuts" | "security";

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
    name: "Cyber Mesh",
    value: "linear-gradient(135deg, #09090b 0%, #00f3ff 100%)",
    preview: "from-cyan-950 to-gray-950",
  },
];

export function SettingsWindow() {
  const { wallpaper, setWallpaper, theme, setTheme } = useTheme();
  const { iconTheme, setIconTheme } = useIconTheme();
  const [activeTab, setActiveTab] = useState<Tab>("api");
  const { osStyle, setOsStyle, setWallpaper: setStoreWallpaper, wallpaper: currentStoreWallpaper } = useThemeStore();
  
  const [dbWallpapers, setDbWallpapers] = useState<CustomWallpaperItem[]>([]);
  const [shortcutsConfig, setShortcutsConfig] = useState(() => loadShortcutsConfig());
  const [recordingId, setRecordingId] = useState<string | null>(null);
  
  // Persistent Storage Form States
  const [masterPin, setMasterPin] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [hfSpaceUrl, setHfSpaceUrl] = useState("");
  const [tgBotToken, setTgBotToken] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [cloudVerification, setCloudVerification] = useState<{
    exists: boolean;
    savedKeys: { gmailOAuth: boolean; gmailToken: boolean; telegramToken: boolean; vfsFileCount: number; trashCount: number; lastSynced: string };
  } | null>(null);

  const runVerification = async () => {
    const res = await verifyCloudContent();
    setCloudVerification(res);
  };

  useEffect(() => {
    runVerification();
  }, []);

  const [systemInfo, setSystemInfo] = useState<{
    environment: string;
    storage: { adapter: string; persistent: boolean; note: string };
    counts: { vfsNodes: number; telegramChats: number };
  } | null>(null);

  useEffect(() => {
    // Load existing settings on mount
    setMasterPin(localStorage.getItem("iris_master_pin") || "@@#:");
    setGoogleClientId(localStorage.getItem("iris_gmail_client_id") || localStorage.getItem("iris_g_client_id") || "");
    setGoogleClientSecret(localStorage.getItem("iris_gmail_client_secret") || localStorage.getItem("iris_g_secret") || "");
    setHfSpaceUrl(localStorage.getItem("iris_hf_endpoint") || localStorage.getItem("iris_hf_url") || "");
    setTgBotToken(localStorage.getItem("iris_tg_bot_token") || localStorage.getItem("iris_telegram_token") || localStorage.getItem("iris_tg_token") || "");
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (masterPin) localStorage.setItem("iris_master_pin", masterPin);
    localStorage.setItem("iris_gmail_client_id", googleClientId);
    localStorage.setItem("iris_g_client_id", googleClientId);
    localStorage.setItem("iris_gmail_client_secret", googleClientSecret);
    localStorage.setItem("iris_g_secret", googleClientSecret);
    localStorage.setItem("iris_hf_endpoint", hfSpaceUrl);
    localStorage.setItem("iris_hf_url", hfSpaceUrl);
    localStorage.setItem("iris_tg_bot_token", tgBotToken);
    localStorage.setItem("iris_telegram_token", tgBotToken);
    localStorage.setItem("iris_tg_token", tgBotToken);

    await autoSyncToCloud();
    await runVerification();

    setSaveStatus("System settings updated & synced to encrypted vault!");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  useEffect(() => {
    fetch("/api/system")
      .then((res) => res.json())
      .then(setSystemInfo)
      .catch((e) => console.error("Failed to load system info:", e));
  }, []);

  const loadDbWallpapers = async () => {
    const list = await getAllWallpapersFromDb();
    setDbWallpapers(list);
  };

  useEffect(() => {
    loadDbWallpapers();
  }, []);

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
      reader.onload = async (event) => {
        const dataUri = event.target?.result as string;
        const item: CustomWallpaperItem = {
          id: `wp_${Date.now()}`,
          name: file.name,
          dataUrl: dataUri,
          createdAt: Date.now(),
        };
        await saveWallpaperToDb(item);
        setWallpaper(dataUri);
        setStoreWallpaper(dataUri);
        loadDbWallpapers();
      };
      reader.readAsDataURL(file);
    }
  };

  const activeWallpaper = currentStoreWallpaper || wallpaper;

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
          onClick={() => {
            setActiveTab("wallpaper");
            loadDbWallpapers();
          }}
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
              ? "bg-[var(--border)] font-medium text-blue-400"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Gmail OAuth
        </button>

        <button
          onClick={() => setActiveTab("vault")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "vault"
              ? "bg-[var(--border)] font-medium text-blue-400"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Telegram Vault
        </button>

        <button
          onClick={() => setActiveTab("cloud-vault")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "cloud-vault"
              ? "bg-[var(--border)] font-medium text-blue-400"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Cloud State Vault
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

        <button
          onClick={() => setActiveTab("security")}
          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
            activeTab === "security"
              ? "bg-[var(--border)] font-medium"
              : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Security & PIN
        </button>
      </div>

      {/* Content pane */}
      <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
        {activeTab === "appearance" && (
          <div className="space-y-8">
            {/* 1. Theme gallery — this is the primary control. Each theme
                bundles a real color palette, a default wallpaper, an icon
                pack and a shell layout, all applied together. */}
            <div>
              <h3 className="text-lg font-medium mb-1">Theme</h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Pick a full theme — colors, wallpaper, icon pack and taskbar layout all switch together.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {Object.values(themePresets).map((preset) => {
                  const isActive = theme === preset.name;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => setTheme(preset.name as Theme)}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                        isActive
                          ? "border-violet-500 bg-violet-500/10 shadow-md"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80"
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-lg shrink-0 border border-white/10 shadow-inner"
                        style={{ background: preset.wallpaper }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{preset.displayName}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {[preset.colors.accent, preset.colors.card, preset.colors.foreground].map((c, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-full border border-white/10"
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                      </div>
                      {isActive && (
                        <Check className="w-4 h-4 text-violet-400 absolute right-3 top-3 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Shell layout override — usually set automatically by the
                theme above, but power users can mix e.g. Dracula colors
                with the Iris Glass dock. */}
            <div>
              <h3 className="text-lg font-medium mb-1">Taskbar & Window Layout</h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Set automatically by your theme — override it here if you want a different taskbar/window layout without changing colors.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {([
                  { id: "win11", label: "Windows 11 Modern", desc: "Clean translucent layout with a centered start menu, centered app dock and high-contrast system tray" },
                  { id: "win7-aero", label: "Windows 7 Aero Glass", desc: "Glossy transparent layout with blue highlights, left-aligned circular Start orb and app tabs" },
                  { id: "win95-retro", label: "Windows 95 Retro", desc: "Solid classic grey taskbar with a raised 3D Start button and beveled windows" },
                  { id: "macos", label: "macOS Big Sur", desc: "Sleek top menu bar, centered floating bottom Dock, graphite windows with traffic light buttons" },
                  { id: "iris-glass", label: "Iris Glass", desc: "Refined frosted-glass floating dock with specular sheen, rim highlights and a glass clock" },
                ] as { id: OSStyle; label: string; desc: string }[]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setOsStyle(t.id)}
                    className={`relative p-4 rounded-xl border text-left transition cursor-pointer ${
                      osStyle === t.id
                        ? "border-violet-500 bg-violet-500/10 shadow-md"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80"
                    }`}
                  >
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">{t.desc}</div>
                    {osStyle === t.id && (
                      <div className="absolute right-3 top-3 w-2.5 h-2.5 rounded-full bg-violet-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Icon pack — also set automatically by the theme, with a
                manual override that persists in localStorage. */}
            <div>
              <h3 className="text-lg font-medium mb-1">Icon Pack</h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                The look of app icons on the desktop, taskbar and dock.
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-xl">
                {Array.from(iconPackRegistry.values()).map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => setIconTheme(pack.id as Parameters<typeof setIconTheme>[0])}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition cursor-pointer ${
                      iconTheme === pack.id
                        ? "border-violet-500 bg-violet-500/10 shadow-md"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80"
                    }`}
                  >
                    {pack.renderIcon("explorer", 32, "")}
                    <span className="text-xs font-medium">{pack.name}</span>
                    {iconTheme === pack.id && (
                      <Check className="w-3.5 h-3.5 text-violet-400 absolute right-2 top-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "wallpaper" && (
          <div>
            <h3 className="text-lg font-medium mb-1">Desktop Wallpaper</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Choose a color gradient or upload custom image files stored in IndexedDB.
            </p>

            {/* Upload Input */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="wallpaper-upload-btn"
              onChange={handleCustomWallpaperUpload}
            />

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Upload Image trigger */}
              <label
                htmlFor="wallpaper-upload-btn"
                className="border border-[var(--border)] border-dashed hover:border-violet-500 rounded-xl h-[100px] flex flex-col items-center justify-center cursor-pointer transition text-xs text-[var(--muted)] hover:text-violet-400 gap-1.5 bg-[var(--surface)]/30"
              >
                <Plus className="w-5 h-5 text-violet-400" />
                <span>Upload Custom Image</span>
              </label>

              {/* Preset Wallpapers */}
              {WALLPAPER_PRESETS.map((wp) => {
                const isActive = activeWallpaper === wp.value;
                return (
                  <button
                    key={wp.name}
                    onClick={() => {
                      setWallpaper(wp.value);
                      setStoreWallpaper(wp.value);
                    }}
                    className={`group relative overflow-hidden rounded-xl border text-left transition flex flex-col h-[100px] cursor-pointer ${
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
            </div>

            {/* Custom Uploaded Gallery Section (IndexedDB) */}
            {dbWallpapers.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                  My Uploads (IndexedDB Gallery)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {dbWallpapers.map((wp) => {
                    const isActive = activeWallpaper === wp.dataUrl;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => {
                          setWallpaper(wp.dataUrl);
                          setStoreWallpaper(wp.dataUrl);
                        }}
                        className={`group relative overflow-hidden rounded-xl border text-left transition flex flex-col h-[100px] cursor-pointer ${
                          isActive
                            ? "border-violet-500 shadow-lg"
                            : "border-[var(--border)] hover:border-[var(--border)]/80"
                        }`}
                      >
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await deleteWallpaperFromDb(wp.id);
                            loadDbWallpapers();
                            if (activeWallpaper === wp.dataUrl) {
                              setWallpaper("");
                              setStoreWallpaper("");
                            }
                          }}
                          className="absolute right-2 top-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors duration-150 z-10"
                          title="Delete custom wallpaper"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div
                          className="w-full flex-1 bg-center bg-cover bg-no-repeat"
                          style={{ backgroundImage: `url(${wp.dataUrl})` }}
                        />
                        <div className="w-full bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-t border-[var(--border)] flex justify-between items-center">
                          <span className="truncate">{wp.name || "Custom Upload"}</span>
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
                { provider: "Telegram Connector", desc: "Interact with Iris secure chat nodes", linked: true, user: "@prajit_iris" },
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
          <form onSubmit={handleSave} className="space-y-4 max-w-md">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-base font-semibold">Google OAuth Credentials</h3>
              {cloudVerification && (
                <div
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                    cloudVerification.savedKeys.gmailOAuth
                      ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60"
                      : "bg-rose-950/40 text-rose-400 border-rose-800/60"
                  }`}
                >
                  {cloudVerification.savedKeys.gmailOAuth
                    ? "Google OAuth: ✓ Confirmed in Cloud DB"
                    : "Google OAuth: ✕ Local Only (Press Save)"}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">Configure client credentials from Google Cloud Console to enable Gmail mirroring.</p>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Client ID</label>
              <input
                type="text"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="xxxx-xxxx.apps.googleusercontent.com"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:border-blue-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">Client Secret</label>
              <input
                type="password"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:border-blue-500 outline-none font-mono"
              />
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  await revokeServiceAuth('gmail');
                  setGoogleClientId('');
                  setGoogleClientSecret('');
                  await runVerification();
                }}
                className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 text-xs transition-colors cursor-pointer"
              >
                Disconnect & Wipe Keys
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  Save Configurations
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === "vault" && (
          <div className="space-y-6">
            <form onSubmit={handleSave} className="space-y-4 max-w-md">
              <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">Telegram & Hugging Face Vault</h3>
              <p className="text-xs text-[var(--muted)]">Connect your persistent Hugging Face Docker bot to route local OS storage.</p>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Hugging Face Space Endpoint</label>
                <input
                  type="text"
                  value={hfSpaceUrl}
                  onChange={(e) => setHfSpaceUrl(e.target.value)}
                  placeholder="https://your-username-space-name.hf.space"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:border-blue-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  value={tgBotToken}
                  onChange={(e) => setTgBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  Save Configurations
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "cloud-vault" && (
          <div className="space-y-6">
            <DiskUtility />
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
                <span className="font-medium">Iris OS</span>
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
                <span className="font-mono text-xs">{systemInfo?.environment ?? "Loading…"}</span>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-[var(--muted)]">Storage Backend</span>
                <span className={`font-mono text-xs ${systemInfo && !systemInfo.storage.persistent ? "text-amber-400" : ""}`}>
                  {systemInfo ? `${systemInfo.storage.adapter} (${systemInfo.storage.persistent ? "persistent" : "ephemeral"})` : "Loading…"}
                </span>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-[var(--muted)]">Synced Files / Chats</span>
                <span className="font-mono text-xs">
                  {systemInfo ? `${systemInfo.counts.vfsNodes} nodes · ${systemInfo.counts.telegramChats} messages` : "Loading…"}
                </span>
              </div>
            </div>
            {systemInfo && !systemInfo.storage.persistent && (
              <p className="text-xs text-amber-400/90 mt-3 leading-relaxed">
                {systemInfo.storage.note}
              </p>
            )}
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
                      const combo = formatKeyCombo(getShortcutCombination(def.id, shortcutsConfig));
                      const isCustom = !!shortcutsConfig.customBinds[def.id];
                      return (
                        <div key={def.id} className="flex justify-between items-center p-3 text-xs">
                          <div>
                            <div className="font-medium text-zinc-200">{def.name}</div>
                            {isCustom && <div className="text-[9px] text-violet-400 font-medium mt-0.5">Customized</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono bg-[var(--background)] px-2 py-1 border border-[var(--border)] rounded text-[var(--text)] text-[11px] font-medium shadow-sm">
                              {combo}
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

        {activeTab === "security" && (
          <div className="space-y-6 max-w-md">
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">System Lock Screen</h3>
              <p className="text-xs text-[var(--muted)]">Set the Master Passcode required to mount the Iris desktop on boot.</p>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Master Passcode</label>
                <input
                  type="text"
                  value={masterPin}
                  onChange={(e) => setMasterPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={16}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  Save Configurations
                </button>
              </div>
            </form>

            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <h4 className="text-sm font-semibold text-zinc-100">Lock OS Session</h4>
              <p className="text-xs text-[var(--muted)]">
                Immediately lock the system session. You will be prompted for your Master Passcode to return to desktop.
              </p>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem("iris_unlocked");
                  window.location.reload();
                }}
                className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition cursor-pointer"
              >
                Lock Desktop Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}