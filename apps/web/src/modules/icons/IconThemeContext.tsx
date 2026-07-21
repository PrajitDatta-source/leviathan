"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun, MessageSquare, Mail, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { themePresets } from "@/modules/theme/presets";

export interface IconPack {
  id: string;
  name: string;
  renderIcon(appId: string, size: number, className: string): React.ReactNode;
}

export const iconPackRegistry = new Map<string, IconPack>();

export type IconTheme = "windows11" | "windows7" | "kde" | "macos" | "papirus" | "iris";

// Shared appId -> icon component lookup, reused by every pack below so
// adding a new app (e.g. "dashboard") only needs one line, not five.
function iconFor(appId: string, sClass: string) {
  switch (appId) {
    case "explorer":
      return <Folder className={sClass} />;
    case "notes":
      return <FileText className={sClass} />;
    case "terminal":
      return <Terminal className={sClass} />;
    case "settings":
      return <Settings className={sClass} />;
    case "weather":
      return <Sun className={sClass} />;
    case "telegram":
      return <MessageSquare className={sClass} />;
    case "gmail":
      return <Mail className={sClass} />;
    case "dashboard":
      return <LayoutDashboard className={sClass} />;
    case "trash":
      return <Trash2 className={sClass} />;
    default:
      return <Folder className={sClass} />;
  }
}

const APP_ACCENTS: Record<string, string> = {
  explorer: "amber",
  notes: "blue",
  terminal: "zinc",
  settings: "violet",
  weather: "yellow",
  telegram: "sky",
  gmail: "rose",
  dashboard: "cyan",
  trash: "red",
};

// 1. Windows 11 Fluent 3D style wrapper
iconPackRegistry.set("windows11", {
  id: "windows11",
  name: "Windows 11 (Fluent 3D)",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 text-zinc-100 select-none pointer-events-none`;
    const bgMap: Record<string, string> = {
      explorer: "from-amber-400 to-orange-500",
      notes: "from-blue-400 to-indigo-500",
      terminal: "from-zinc-700 to-zinc-900",
      settings: "from-purple-500 to-pink-500",
      weather: "from-yellow-400 to-amber-500",
      telegram: "from-sky-400 to-blue-500",
      gmail: "from-rose-500 to-red-600",
      dashboard: "from-cyan-400 to-blue-500",
      trash: "from-red-500 to-rose-600",
    };
    const bg = bgMap[appId] || "from-violet-500 to-indigo-600";

    return (
      <div
        className={`rounded-xl bg-gradient-to-br ${bg} border border-white/10 flex items-center justify-center shrink-0 shadow-md ${className}`}
        style={{ width: size, height: size }}
      >
        {iconFor(appId, sClass)}
      </div>
    );
  }
});

// 2. Windows 7 / Aero high-gloss style wrapper
iconPackRegistry.set("windows7", {
  id: "windows7",
  name: "Windows 7 / Aero",
  renderIcon(appId, size, className) {
    const colorMap: Record<string, string> = {
      explorer: "text-amber-200",
      notes: "text-blue-200",
      terminal: "text-emerald-200",
      settings: "text-fuchsia-200",
      weather: "text-yellow-200",
      telegram: "text-sky-200",
      gmail: "text-rose-200",
      dashboard: "text-cyan-200",
      trash: "text-rose-200",
    };
    const color = colorMap[appId] || "text-violet-200";
    const sClass = `w-1/2 h-1/2 select-none pointer-events-none ${color}`;
    const bg = "from-cyan-400/80 via-blue-500/40 to-blue-600/80";

    return (
      <div
        className={`relative overflow-hidden rounded-lg border flex items-center justify-center shrink-0 shadow-cyan-500/40 shadow-sm bg-gradient-to-b ${bg} border-cyan-300/60 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-lg select-none pointer-events-none" />
        {iconFor(appId, sClass)}
      </div>
    );
  }
});

// 3. KDE Breeze / Flat Style
iconPackRegistry.set("kde", {
  id: "kde",
  name: "KDE Breeze",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 text-white select-none pointer-events-none`;
    const bgMap: Record<string, string> = {
      explorer: "bg-amber-500",
      notes: "bg-blue-500",
      terminal: "bg-zinc-800",
      settings: "bg-purple-600",
      weather: "bg-yellow-500",
      telegram: "bg-sky-500",
      gmail: "bg-rose-500",
      dashboard: "bg-cyan-600",
      trash: "bg-red-500",
    };
    const bg = bgMap[appId] || "bg-violet-600";

    return (
      <div
        className={`rounded-lg ${bg} flex items-center justify-center shrink-0 shadow ${className}`}
        style={{ width: size, height: size }}
      >
        {iconFor(appId, sClass)}
      </div>
    );
  }
});

// 4. macOS Big Sur layered squircle style wrapper
iconPackRegistry.set("macos", {
  id: "macos",
  name: "macOS Big Sur",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 text-zinc-200 select-none pointer-events-none`;
    const bgMap: Record<string, string> = {
      explorer: "bg-gradient-to-b from-yellow-400 to-amber-600",
      notes: "bg-gradient-to-b from-blue-400 to-blue-600",
      terminal: "bg-gradient-to-b from-zinc-800 to-zinc-950",
      settings: "bg-gradient-to-b from-zinc-700 to-zinc-900",
      weather: "bg-gradient-to-b from-amber-400 to-orange-500",
      telegram: "bg-gradient-to-b from-sky-400 to-sky-600",
      gmail: "bg-gradient-to-b from-red-400 to-rose-600",
      dashboard: "bg-gradient-to-b from-cyan-400 to-sky-600",
      trash: "bg-gradient-to-b from-zinc-600 to-zinc-800",
    };
    const bg = bgMap[appId] || "bg-gradient-to-b from-indigo-500 to-indigo-800";

    return (
      <div
        className={`rounded-2xl ${bg} border border-zinc-700/50 flex items-center justify-center shrink-0 shadow-xl ${className}`}
        style={{ width: size, height: size }}
      >
        {iconFor(appId, sClass)}
      </div>
    );
  }
});

// 5. Papirus circular flat style wrapper
iconPackRegistry.set("papirus", {
  id: "papirus",
  name: "Papirus",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 text-white select-none pointer-events-none`;
    const bgMap: Record<string, string> = {
      explorer: "bg-amber-600",
      notes: "bg-indigo-600",
      terminal: "bg-zinc-800",
      settings: "bg-teal-600",
      weather: "bg-orange-500",
      telegram: "bg-sky-500",
      gmail: "bg-rose-500",
      dashboard: "bg-cyan-700",
      trash: "bg-red-500",
    };
    const bg = bgMap[appId] || "bg-indigo-600";

    return (
      <div
        className={`rounded-full ${bg} flex items-center justify-center shrink-0 shadow-md ${className}`}
        style={{ width: size, height: size }}
      >
        {iconFor(appId, sClass)}
      </div>
    );
  }
});

// 6. Iris Glass — refined frosted glass-pane squircle, matching the
// iris-glass theme's specular sheen + rim highlight language.
iconPackRegistry.set("iris", {
  id: "iris",
  name: "Iris Glass",
  renderIcon(appId, size, className) {
    const accent = APP_ACCENTS[appId] || "violet";
    const sClass = `w-1/2 h-1/2 text-white/90 select-none pointer-events-none drop-shadow-sm`;
    const accentGlow: Record<string, string> = {
      amber: "shadow-[0_0_18px_-4px_rgba(251,191,36,0.55)]",
      blue: "shadow-[0_0_18px_-4px_rgba(96,165,250,0.55)]",
      zinc: "shadow-[0_0_18px_-4px_rgba(161,161,170,0.4)]",
      violet: "shadow-[0_0_18px_-4px_rgba(167,139,250,0.6)]",
      yellow: "shadow-[0_0_18px_-4px_rgba(250,204,21,0.55)]",
      sky: "shadow-[0_0_18px_-4px_rgba(56,189,248,0.55)]",
      rose: "shadow-[0_0_18px_-4px_rgba(251,113,133,0.55)]",
      cyan: "shadow-[0_0_18px_-4px_rgba(34,211,238,0.55)]",
      red: "shadow-[0_0_18px_-4px_rgba(248,113,113,0.55)]",
    };

    return (
      <div
        className={`glass-pane relative rounded-[28%] flex items-center justify-center shrink-0 overflow-hidden ${accentGlow[accent]} ${className}`}
        style={{ width: size, height: size, borderRadius: size * 0.6 }}
      >
        {iconFor(appId, sClass)}
      </div>
    );
  }
});

interface IconThemeContextValue {
  iconTheme: IconTheme;
  setIconTheme: (theme: IconTheme) => void;
}

const IconThemeContext = createContext<IconThemeContextValue | null>(null);

export function useIconTheme() {
  const context = useContext(IconThemeContext);
  if (!context) {
    throw new Error("useIconTheme must be used within an IconThemeProvider");
  }
  return context;
}

export function IconThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [iconTheme, setIconThemeState] = useState<IconTheme>("windows11");
  const [userOverride, setUserOverride] = useState(false);

  // On mount, respect a manually-picked icon pack if the user set one.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("iris_icon_theme") as IconTheme | null;
    if (saved && iconPackRegistry.has(saved)) {
      setIconThemeState(saved);
      setUserOverride(true);
    }
  }, []);

  // Sync iconTheme automatically with the active theme preset's iconPack,
  // unless the user has explicitly overridden it in Settings.
  useEffect(() => {
    if (userOverride) return;
    const activePreset = themePresets[theme];
    if (activePreset && activePreset.iconPack && iconPackRegistry.has(activePreset.iconPack)) {
      setIconThemeState(activePreset.iconPack as IconTheme);
    }
  }, [theme, userOverride]);

  const setIconTheme = (newTheme: IconTheme) => {
    setIconThemeState(newTheme);
    setUserOverride(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("iris_icon_theme", newTheme);
    }
  };

  return (
    <IconThemeContext.Provider value={{ iconTheme, setIconTheme }}>
      {children}
    </IconThemeContext.Provider>
  );
}

export { AppIcon } from "@/components/icons/AppIcon";
