"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme } from "./types";
import { themePresets } from "./presets";
import { profileManager } from "../identity/profile/manager";

// Synthetic web audio tone generator for zero-dependency sound packs
export function playThemeSound(type: "startup" | "click" | "error") {
  if (typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === "click") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === "startup") {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (major chord)
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.05 + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.65);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.7);
      });
    } else if (type === "error") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn("AudioContext failed to trigger synthetic sound", e);
  }
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  wallpaper: string;
  setWallpaper: (wallpaper: string) => void;
  customWallpapers: string[];
  addCustomWallpaper: (wp: string) => void;
  deleteCustomWallpaper: (wp: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("leviathan-dark");
  const [wallpaper, setWallpaperState] = useState<string>(
    "linear-gradient(135deg, #09090b 0%, #020205 100%)"
  );
  const [customWallpapers, setCustomWallpapers] = useState<string[]>([]);

  // Load initial theme, wallpaper and custom wallpapers from backend DB on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefs = profileManager.getPreferences();
      if (prefs) {
        if (prefs.theme) setThemeState(prefs.theme as Theme);
        if (prefs.wallpaper) setWallpaperState(prefs.wallpaper);
      }
      
      // Sync from backend
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (data.theme) setThemeState(data.theme as Theme);
            if (data.wallpaper) setWallpaperState(data.wallpaper);
            if (data.customWallpapers) setCustomWallpapers(data.customWallpapers);
            profileManager.updatePreferences(data);
          }
        })
        .catch((err) => console.error("Settings backend sync failed:", err));
    }
  }, []);

  const pushSettingsToBackend = async (newTheme: Theme, newWp: string, newCustomWps: string[]) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          theme: newTheme, 
          wallpaper: newWp,
          customWallpapers: newCustomWps 
        }),
      });
    } catch (e) {
      console.error("Failed to push settings to backend:", e);
    }
  };

  // Sync theme to profileManager preferences
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    profileManager.updatePreferences({ theme: newTheme as any });
    
    // Automatically apply theme's default wallpaper if present
    const preset = themePresets[newTheme];
    let nextWp = wallpaper;
    if (preset && preset.wallpaper) {
      nextWp = preset.wallpaper;
      setWallpaperState(preset.wallpaper);
      profileManager.updatePreferences({ wallpaper: preset.wallpaper });
    }

    // Play startup sound if configured in theme
    if (preset && preset.soundPack === "synthetic") {
      playThemeSound("startup");
    }

    pushSettingsToBackend(newTheme, nextWp, customWallpapers);
  };

  // Sync wallpaper to profileManager preferences
  const setWallpaper = (newWallpaper: string) => {
    setWallpaperState(newWallpaper);
    profileManager.updatePreferences({ wallpaper: newWallpaper });
    pushSettingsToBackend(theme, newWallpaper, customWallpapers);
  };

  const addCustomWallpaper = (wp: string) => {
    const updated = [...customWallpapers, wp];
    setCustomWallpapers(updated);
    pushSettingsToBackend(theme, wp, updated);
  };

  const deleteCustomWallpaper = (wp: string) => {
    const updated = customWallpapers.filter(w => w !== wp);
    setCustomWallpapers(updated);
    
    let nextWp = wallpaper;
    if (wallpaper === wp) {
      nextWp = themePresets[theme]?.wallpaper || "linear-gradient(135deg, #09090b 0%, #020205 100%)";
      setWallpaperState(nextWp);
      profileManager.updatePreferences({ wallpaper: nextWp });
    }
    
    pushSettingsToBackend(theme, nextWp, updated);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const activeTheme = themePresets[theme] || themePresets["leviathan-dark"];
    const colors = activeTheme.colors;

    // Apply color values to CSS custom variables
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--text", colors.foreground);
    root.style.setProperty("--muted", colors.secondary);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--surface", colors.card);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--wallpaper", wallpaper);

    // Apply custom theme cursor
    root.style.cursor = activeTheme.cursor || "default";

    // Set dataset theme attribute for tailwind / ad-hoc styles
    root.setAttribute("data-theme", theme);
    
    // Add glass helper classes if theme is glass
    if (theme === "glass" || theme === "fluent-glass") {
      root.classList.add("theme-glass");
    } else {
      root.classList.remove("theme-glass");
    }
  }, [theme, wallpaper]);

  // Global click listener to play click sounds
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleGlobalClick = () => {
      const activePreset = themePresets[theme];
      if (activePreset && activePreset.soundPack === "synthetic") {
        playThemeSound("click");
      }
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      wallpaper, 
      setWallpaper,
      customWallpapers,
      addCustomWallpaper,
      deleteCustomWallpaper
    }}>
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
