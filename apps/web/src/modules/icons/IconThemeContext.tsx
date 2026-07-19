"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun, MessageSquare, Mail } from "lucide-react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { themePresets } from "@/modules/theme/presets";

export interface IconPack {
  id: string;
  name: string;
  renderIcon(appId: string, size: number, className: string): React.ReactNode;
}

export const iconPackRegistry = new Map<string, IconPack>();

export type IconTheme = "windows11" | "windows7" | "kde" | "macos" | "papirus";

// 1. Windows 11 Fluent 3D style wrapper
iconPackRegistry.set("windows11", {
  id: "windows11",
  name: "Windows 11 (Fluent 3D)",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 text-zinc-100 select-none pointer-events-none`;
    let bg = "from-violet-500 to-indigo-600";
    let icon = <Folder className={sClass} />;

    if (appId === "explorer") {
      bg = "from-amber-400 to-orange-500";
      icon = <Folder className={sClass} />;
    } else if (appId === "notes") {
      bg = "from-blue-400 to-indigo-500";
      icon = <FileText className={sClass} />;
    } else if (appId === "terminal") {
      bg = "from-zinc-700 to-zinc-900";
      icon = <Terminal className={sClass} />;
    } else if (appId === "settings") {
      bg = "from-purple-500 to-pink-500";
      icon = <Settings className={sClass} />;
    } else if (appId === "weather") {
      bg = "from-yellow-400 to-amber-500";
      icon = <Sun className={sClass} />;
    } else if (appId === "telegram") {
      bg = "from-sky-400 to-blue-500";
      icon = <MessageSquare className={sClass} />;
    } else if (appId === "gmail") {
      bg = "from-rose-500 to-red-600";
      icon = <Mail className={sClass} />;
    } else if (appId === "trash") {
      bg = "from-red-500 to-rose-600";
      icon = <Trash2 className={sClass} />;
    }

    return (
      <div
        className={`rounded-xl bg-gradient-to-br ${bg} border border-white/10 flex items-center justify-center shrink-0 shadow-md ${className}`}
        style={{ width: size * 2.2, height: size * 2.2 }}
      >
        {icon}
      </div>
    );
  }
});

// 2. Windows 7 / Aero high-gloss style wrapper
iconPackRegistry.set("windows7", {
  id: "windows7",
  name: "Windows 7 / Aero",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 select-none pointer-events-none`;
    let color = "text-violet-200";
    let bg = "from-cyan-400/80 via-blue-500/40 to-blue-600/80";
    let icon = <Folder className={`${sClass} ${color}`} />;

    if (appId === "explorer") {
      color = "text-amber-200";
      icon = <Folder className={`${sClass} ${color}`} />;
    } else if (appId === "notes") {
      color = "text-blue-200";
      icon = <FileText className={`${sClass} ${color}`} />;
    } else if (appId === "terminal") {
      color = "text-emerald-200";
      icon = <Terminal className={`${sClass} ${color}`} />;
    } else if (appId === "settings") {
      color = "text-fuchsia-200";
      icon = <Settings className={`${sClass} ${color}`} />;
    } else if (appId === "weather") {
      color = "text-yellow-200";
      icon = <Sun className={`${sClass} ${color}`} />;
    } else if (appId === "telegram") {
      color = "text-sky-200";
      icon = <MessageSquare className={`${sClass} ${color}`} />;
    } else if (appId === "gmail") {
      color = "text-rose-200";
      icon = <Mail className={`${sClass} ${color}`} />;
    } else if (appId === "trash") {
      color = "text-rose-200";
      icon = <Trash2 className={`${sClass} ${color}`} />;
    }

    return (
      <div
        className={`relative overflow-hidden rounded-lg border flex items-center justify-center shrink-0 shadow-cyan-500/40 shadow-sm bg-gradient-to-b ${bg} border-cyan-300/60 ${className}`}
        style={{ width: size * 2.2, height: size * 2.2 }}
      >
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-lg select-none pointer-events-none" />
        {icon}
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
    let bg = "bg-violet-600";
    let icon = <Folder className={sClass} />;

    if (appId === "explorer") {
      bg = "bg-amber-500";
      icon = <Folder className={sClass} />;
    } else if (appId === "notes") {
      bg = "bg-blue-500";
      icon = <FileText className={sClass} />;
    } else if (appId === "terminal") {
      bg = "bg-zinc-800";
      icon = <Terminal className={sClass} />;
    } else if (appId === "settings") {
      bg = "bg-purple-600";
      icon = <Settings className={sClass} />;
    } else if (appId === "weather") {
      bg = "bg-yellow-500";
      icon = <Sun className={sClass} />;
    } else if (appId === "telegram") {
      bg = "bg-sky-500";
      icon = <MessageSquare className={sClass} />;
    } else if (appId === "gmail") {
      bg = "bg-rose-500";
      icon = <Mail className={sClass} />;
    } else if (appId === "trash") {
      bg = "bg-red-500";
      icon = <Trash2 className={sClass} />;
    }

    return (
      <div
        className={`rounded-lg ${bg} flex items-center justify-center shrink-0 shadow ${className}`}
        style={{ width: size * 2.2, height: size * 2.2 }}
      >
        {icon}
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
    let bg = "bg-gradient-to-b from-indigo-500 to-indigo-800";
    let icon = <Folder className={sClass} />;

    if (appId === "explorer") {
      bg = "bg-gradient-to-b from-yellow-400 to-amber-600";
      icon = <Folder className={sClass} />;
    } else if (appId === "notes") {
      bg = "bg-gradient-to-b from-blue-400 to-blue-600";
      icon = <FileText className={sClass} />;
    } else if (appId === "terminal") {
      bg = "bg-gradient-to-b from-zinc-800 to-zinc-950";
      icon = <Terminal className={sClass} />;
    } else if (appId === "settings") {
      bg = "bg-gradient-to-b from-zinc-700 to-zinc-900";
      icon = <Settings className={sClass} />;
    } else if (appId === "weather") {
      bg = "bg-gradient-to-b from-amber-400 to-orange-500";
      icon = <Sun className={sClass} />;
    } else if (appId === "telegram") {
      bg = "bg-gradient-to-b from-sky-400 to-sky-600";
      icon = <MessageSquare className={sClass} />;
    } else if (appId === "gmail") {
      bg = "bg-gradient-to-b from-red-400 to-rose-600";
      icon = <Mail className={sClass} />;
    } else if (appId === "trash") {
      bg = "bg-gradient-to-b from-zinc-600 to-zinc-800";
      icon = <Trash2 className={sClass} />;
    }

    return (
      <div
        className={`rounded-2xl ${bg} border border-zinc-700/50 flex items-center justify-center shrink-0 shadow-xl ${className}`}
        style={{ width: size * 2.2, height: size * 2.2 }}
      >
        {icon}
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
    let bg = "bg-indigo-600";
    let icon = <Folder className={sClass} />;

    if (appId === "explorer") {
      bg = "bg-amber-600";
      icon = <Folder className={sClass} />;
    } else if (appId === "notes") {
      bg = "bg-indigo-600";
      icon = <FileText className={sClass} />;
    } else if (appId === "terminal") {
      bg = "bg-zinc-800";
      icon = <Terminal className={sClass} />;
    } else if (appId === "settings") {
      bg = "bg-teal-600";
      icon = <Settings className={sClass} />;
    } else if (appId === "weather") {
      bg = "bg-orange-500";
      icon = <Sun className={sClass} />;
    } else if (appId === "telegram") {
      bg = "bg-sky-500";
      icon = <MessageSquare className={sClass} />;
    } else if (appId === "gmail") {
      bg = "bg-rose-500";
      icon = <Mail className={sClass} />;
    } else if (appId === "trash") {
      bg = "bg-red-500";
      icon = <Trash2 className={sClass} />;
    }

    return (
      <div
        className={`rounded-full ${bg} flex items-center justify-center shrink-0 shadow-md ${className}`}
        style={{ width: size * 2.2, height: size * 2.2 }}
      >
        {icon}
      </div>
    );
  }
});

interface IconThemeContextValue {
  iconTheme: string;
  setIconTheme: (theme: string) => void;
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
  const [iconTheme, setIconThemeState] = useState<string>("windows11");

  // Sync iconTheme automatically with theme presets unless customized
  useEffect(() => {
    const activePreset = themePresets[theme];
    if (activePreset && activePreset.iconPack) {
      setIconThemeState(activePreset.iconPack);
    }
  }, [theme]);

  const setIconTheme = (newTheme: string) => {
    setIconThemeState(newTheme);
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

interface AppIconProps {
  appId: string;
  size?: number;
  className?: string;
}

export function AppIcon({ appId, size = 20, className = "" }: AppIconProps) {
  const { iconTheme } = useIconTheme();
  const pack = iconPackRegistry.get(iconTheme) || iconPackRegistry.get("windows11");
  if (pack) {
    return pack.renderIcon(appId, size, className) as React.ReactElement;
  }
  
  // Safe Fallback
  return (
    <div
      className={`rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size * 2.2, height: size * 2.2 }}
    >
      <Folder className="w-1/2 h-1/2 text-zinc-100" />
    </div>
  );
}
