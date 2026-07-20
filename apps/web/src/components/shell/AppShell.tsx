"use client";

import React, { useState, useEffect } from "react";
import { useThemeStore } from "@/modules/theme/useThemeStore";
import { Taskbar } from "@/components/shell/Taskbar";
import { AppIcon } from "@/components/icons/AppIcon";

export function AppShell() {
  // ALL HOOKS CALLED STRICTLY AT THE TOP FOR HYDRATION PARITY
  const [mounted, setMounted] = useState(false);
  const { osStyle, colorMode, wallpaper } = useThemeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0c] flex items-center justify-center select-none">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Dynamic fallback wallpapers if custom wallpaper is not set
  const getWallpaperStyle = () => {
    if (wallpaper) return { background: `url(${wallpaper}) center/cover no-repeat` };
    if (osStyle === "win95-retro") return { background: "#008080" }; // Classic Teal
    if (osStyle === "macos") return { background: "linear-gradient(135deg, #4f3961 0%, #1d2671 100%)" };
    if (osStyle === "win7-aero") return { background: "radial-gradient(circle at center, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)" };
    return { background: "radial-gradient(circle at 50% 20%, #1a1c29 0%, #0a0a0c 100%)" }; // Win11 Dark
  };

  const desktopApps = [
    { id: "explorer", label: "Files" },
    { id: "notes", label: "Notes" },
    { id: "terminal", label: "Terminal" },
    { id: "settings", label: "Settings" },
    { id: "telegram", label: "Telegram" },
    { id: "trash", label: "Recycle Bin" },
  ];

  return (
    <div
      data-os={osStyle}
      data-theme={colorMode}
      className="h-screen w-screen relative overflow-hidden select-none font-sans"
      style={getWallpaperStyle()}
    >
      {/* Free-Standing Desktop Icons (No dark wrapping boxes!) */}
      <div className={`absolute top-8 left-4 flex flex-col space-y-4 z-10 ${osStyle === "macos" ? "top-10" : ""}`}>
        {desktopApps.map((app) => (
          <div
            key={app.id}
            className="group flex flex-col items-center justify-center w-20 p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <AppIcon appId={app.id} size={42}/>
            <span
              className={`mt-1 text-center font-medium leading-tight drop-shadow-md truncate w-full ${
                osStyle === "win95-retro"
                  ? "bg-white text-black px-1 border border-dotted border-black font-sans text-xs"
                  : "text-white text-xs"
              }`}
            >
              {app.label}
            </span>
          </div>
        ))}
      </div>

      {/* Main OS Taskbar / Docks */}
      <Taskbar/>
    </div>
  );
}