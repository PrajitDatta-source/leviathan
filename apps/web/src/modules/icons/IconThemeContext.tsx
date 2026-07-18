"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun, MessageSquare, CloudRain } from "lucide-react";

export type IconTheme = "windows11" | "windows7" | "kde" | "macos" | "papirus";

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
  const [iconTheme, setIconThemeState] = useState<IconTheme>("windows11");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leviathan_icon_theme") as IconTheme;
      if (stored) {
        setIconThemeState(stored);
      }
    }
  }, []);

  const setIconTheme = (newTheme: IconTheme) => {
    setIconThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("leviathan_icon_theme", newTheme);
    }
  };

  return (
    <IconThemeContext.Provider value={{ iconTheme, setIconTheme }}>
      {children}
    </IconThemeContext.Provider>
  );
}

interface AppIconProps {
  appId: string;
  size?: number;
  className?: string;
}

export function AppIcon({ appId, size = 20, className = "" }: AppIconProps) {
  const { iconTheme } = useIconTheme();

  // Get glyph icon component
  const getGlyph = (id: string) => {
    const sClass = `w-1/2 h-1/2 select-none pointer-events-none`;
    switch (id) {
      case "explorer":
        return <Folder className={`${sClass} text-yellow-500`} />;
      case "notes":
        return <FileText className={`${sClass} text-blue-500`} />;
      case "terminal":
        return <Terminal className={`${sClass} text-zinc-300`} />;
      case "settings":
        return <Settings className={`${sClass} text-violet-500`} />;
      case "weather":
        return <Sun className={`${sClass} text-amber-500`} />;
      case "telegram":
        return <MessageSquare className={`${sClass} text-sky-400`} />;
      default:
        return <Folder className={sClass} />;
    }
  };

  // Switch wrapper rendering styling according to IconTheme
  switch (iconTheme) {
    case "windows11":
      // Modern Fluent 3D JPG Icon previews (or custom fluent style for telegram)
      const isRegisteredFluent = ["explorer", "notes", "settings", "terminal", "weather", "trash"].includes(appId);
      if (isRegisteredFluent) {
        return (
          <div className={`relative overflow-hidden rounded-xl bg-zinc-900 border border-white/10 shadow-md shrink-0 flex items-center justify-center ${className}`} style={{ width: size * 2.2, height: size * 2.2 }}>
            <img
              src={`/assets/icons/${appId}.jpg`}
              alt={appId}
              className="w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />
          </div>
        );
      }
      return (
        <div className={`rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-sm ${className}`} style={{ width: size * 2.2, height: size * 2.2 }}>
          {getGlyph(appId)}
        </div>
      );

    case "windows7":
      // High-Gloss Aero Glass style wrappers
      return (
        <div className={`relative overflow-hidden rounded-lg border flex items-center justify-center shrink-0 shadow-cyan-500/40 shadow-sm bg-gradient-to-b from-cyan-400/80 via-blue-500/40 to-blue-600/80 border-cyan-300/60 ${className}`} style={{ width: size * 2.2, height: size * 2.2 }}>
          {/* Aero Glass top highlights reflection overlay */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-lg select-none pointer-events-none" />
          {getGlyph(appId)}
        </div>
      );

    case "kde":
      // KDE Breeze flat sharp geometry style wrappers
      return (
        <div className={`rounded-lg bg-gradient-to-br from-cyan-500/90 to-blue-500/90 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-md ${className}`} style={{ width: size * 2.2, height: size * 2.2 }}>
          {getGlyph(appId)}
        </div>
      );

    case "macos":
      // macOS Big Sur rounded layered squircles with drop shadow
      return (
        <div className={`rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700/50 flex items-center justify-center shrink-0 shadow-2xl ${className}`} style={{ width: size * 2.2, height: size * 2.2 }}>
          {getGlyph(appId)}
        </div>
      );

    case "papirus":
      // Circular bold flat geometric icons
      return (
        <div className={`rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-sm ${className}`} style={{ width: size * 2.2, height: size * 2.2 }}>
          {getGlyph(appId)}
        </div>
      );

    default:
      return (
        <div className={`rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 ${className}`} style={{ width: size * 2.2, height: size * 2.2 }}>
          {getGlyph(appId)}
        </div>
      );
  }
}
