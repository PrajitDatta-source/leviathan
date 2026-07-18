"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme } from "./types";
import { themePresets } from "./presets";
import { profileManager } from "../identity/profile/manager";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  wallpaper: string;
  setWallpaper: (wallpaper: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [wallpaper, setWallpaperState] = useState<string>(
    "linear-gradient(135deg, #09090b 0%, #020205 100%)"
  );

  // Load initial theme and wallpaper from preferences on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefs = profileManager.getPreferences();
      if (prefs) {
        if (prefs.theme) {
          setThemeState(prefs.theme as Theme);
        }
        if (prefs.wallpaper) {
          setWallpaperState(prefs.wallpaper);
        }
      }
    }
  }, []);

  // Sync theme to profileManager preferences
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    profileManager.updatePreferences({ theme: newTheme as any });
  };

  // Sync wallpaper to profileManager preferences
  const setWallpaper = (newWallpaper: string) => {
    setWallpaperState(newWallpaper);
    profileManager.updatePreferences({ wallpaper: newWallpaper });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const activeTheme = themePresets[theme] || themePresets.dark;
    const colors = activeTheme.colors;

    // Apply color values to CSS custom variables
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--text", colors.foreground);
    root.style.setProperty("--muted", colors.secondary);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--surface", colors.card);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--wallpaper", wallpaper);

    // Set dataset theme attribute for tailwind / ad-hoc styles
    root.setAttribute("data-theme", theme);
    
    // Add glass helper classes if theme is glass
    if (theme === "glass") {
      root.classList.add("theme-glass");
    } else {
      root.classList.remove("theme-glass");
    }
  }, [theme, wallpaper]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, wallpaper, setWallpaper }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
