"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun, MessageSquare, Mail, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { themePresets } from "@/modules/theme/presets";
import { IconPack as IconPackName } from "@/modules/theme/types";

export interface IconPack {
  id: string;
  name: string;
  renderIcon(appId: string, size: number, className: string): React.ReactNode;
}

export const iconPackRegistry = new Map<string, IconPack>();
export type IconTheme = IconPackName;

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

// Each app gets ONE consistent accent used only as a subtle tint on the
// glyph itself (stroke color) — not a saturated background tile. This is
// what actually fixes the "looks like Android 8" complaint: that look
// comes specifically from a grid of different fully-saturated colored
// chips, one per app. A shared neutral surface with the glyph as the only
// point of color reads as considered rather than gaudy.
const APP_TINT: Record<string, string> = {
  explorer: "#f5b942",
  notes: "#5b9bf7",
  terminal: "#8a8f98",
  settings: "#a78bfa",
  weather: "#f5c542",
  telegram: "#5bc0f8",
  gmail: "#f76b6b",
  dashboard: "#4fd1c5",
  trash: "#9a9aa2",
};

// 1. MODERN — flat glyph, no background chip, transparent surface. Used
// by Windows 11, Light, Dark, and Glass. This is what real Windows 11 /
// macOS taskbar icons actually look like for system utilities: the glyph
// IS the icon, not a colored square with an icon inside it.
iconPackRegistry.set("modern", {
  id: "modern",
  name: "Modern",
  renderIcon(appId, size, className) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 text-[var(--text)] ${className}`}
        style={{ width: size, height: size }}
      >
        {iconFor(appId, "w-[62%] h-[62%]")}
      </div>
    );
  }
});

// 2. AERO — glossy 3D chip, deliberately kept for Windows 7 Aero only.
// This IS meant to look like a period-correct Aero icon (rounded glass
// tile with a top sheen) — that's the point of picking that theme.
iconPackRegistry.set("aero", {
  id: "aero",
  name: "Aero Glass",
  renderIcon(appId, size, className) {
    const tint = APP_TINT[appId] || "#5bc0f8";
    return (
      <div
        className={`relative overflow-hidden rounded-[22%] border flex items-center justify-center shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: `linear-gradient(180deg, ${tint}55 0%, ${tint}22 55%, ${tint}44 100%)`,
          borderColor: `${tint}66`,
          boxShadow: `0 2px 8px -2px ${tint}55, inset 0 1px 0 rgba(255,255,255,0.4)`,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 rounded-t-[22%] pointer-events-none" />
        <div className="relative text-white" style={{ width: "58%", height: "58%" }}>
          {iconFor(appId, "w-full h-full drop-shadow-sm")}
        </div>
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
  const [iconTheme, setIconThemeState] = useState<IconTheme>("modern");
  const [userOverride, setUserOverride] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("iris_icon_theme") as IconTheme | null;
    if (saved && iconPackRegistry.has(saved)) {
      setIconThemeState(saved);
      setUserOverride(true);
    }
  }, []);

  // Icon pack automatically follows the active theme's iconPack unless the
  // user has explicitly overridden it.
  useEffect(() => {
    if (userOverride) return;
    const activePreset = themePresets[theme];
    if (activePreset && iconPackRegistry.has(activePreset.iconPack)) {
      setIconThemeState(activePreset.iconPack);
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
