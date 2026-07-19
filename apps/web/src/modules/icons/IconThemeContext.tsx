"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun, MessageSquare } from "lucide-react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { themePresets } from "@/modules/theme/presets";

export interface IconPack {
  id: string;
  name: string;
  renderIcon(appId: string, size: number, className: string): React.ReactNode;
}

export const iconPackRegistry = new Map<string, IconPack>();

export type IconTheme = string;

// 1. Flat Icon Pack (Default Leviathan style)
iconPackRegistry.set("flat", {
  id: "flat",
  name: "Leviathan Flat",
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

// 2. Fluent / Glass Icon Pack
iconPackRegistry.set("fluent", {
  id: "fluent",
  name: "Glass Fluent",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 select-none pointer-events-none`;
    let color = "text-violet-400";
    let icon = <Folder className={`${sClass} ${color}`} />;

    if (appId === "explorer") {
      color = "text-amber-400";
      icon = <Folder className={`${sClass} ${color}`} />;
    } else if (appId === "notes") {
      color = "text-blue-400";
      icon = <FileText className={`${sClass} ${color}`} />;
    } else if (appId === "terminal") {
      color = "text-emerald-400";
      icon = <Terminal className={`${sClass} ${color}`} />;
    } else if (appId === "settings") {
      color = "text-fuchsia-400";
      icon = <Settings className={`${sClass} ${color}`} />;
    } else if (appId === "weather") {
      color = "text-yellow-400";
      icon = <Sun className={`${sClass} ${color}`} />;
    } else if (appId === "telegram") {
      color = "text-sky-400";
      icon = <MessageSquare className={`${sClass} ${color}`} />;
    } else if (appId === "trash") {
      color = "text-rose-400";
      icon = <Trash2 className={`${sClass} ${color}`} />;
    }

    return (
      <div
        className={`rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center shrink-0 shadow-lg ${className}`}
        style={{ width: size * 2.2, height: size * 2.2 }}
      >
        {icon}
      </div>
    );
  }
});

// 3. Classic / Retro System Pack
iconPackRegistry.set("classic", {
  id: "classic",
  name: "Retro Macintosh",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 text-black select-none pointer-events-none`;
    let icon = <Folder className={sClass} />;

    if (appId === "explorer") {
      icon = <Folder className={sClass} />;
    } else if (appId === "notes") {
      icon = <FileText className={sClass} />;
    } else if (appId === "terminal") {
      icon = <Terminal className={sClass} />;
    } else if (appId === "settings") {
      icon = <Settings className={sClass} />;
    } else if (appId === "weather") {
      icon = <Sun className={sClass} />;
    } else if (appId === "telegram") {
      icon = <MessageSquare className={sClass} />;
    } else if (appId === "trash") {
      icon = <Trash2 className={sClass} />;
    }

    return (
      <div
        className={`bg-zinc-300 border-2 border-t-white border-l-white border-b-zinc-600 border-r-zinc-600 flex items-center justify-center shrink-0 shadow-sm ${className}`}
        style={{ width: size * 2.2, height: size * 2.2 }}
      >
        {icon}
      </div>
    );
  }
});

// 4. Material Pack
iconPackRegistry.set("material", {
  id: "material",
  name: "Material Design",
  renderIcon(appId, size, className) {
    const sClass = `w-1/2 h-1/2 text-white select-none pointer-events-none`;
    let bg = "bg-blue-600";
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
  const [iconTheme, setIconThemeState] = useState<string>("flat");

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
  const pack = iconPackRegistry.get(iconTheme) || iconPackRegistry.get("flat");
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
