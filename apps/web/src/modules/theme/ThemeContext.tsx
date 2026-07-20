"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme } from "./types";
import { themePresets } from "./presets";
import { profileManager } from "../identity/profile/manager";
import { useThemeStore, OSStyle } from "@/core/theme/useThemeStore";

// Synthetic web audio tone generator for zero-dependency sound packs
export function playThemeSound(type: "startup" | "click" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
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
  const [theme, setThemeState] = useState<Theme>("iris-dark");
  const [wallpaper, setWallpaperState] = useState<string>(
    "linear-gradient(135deg, #09090b 0%, #020205 100%)"
  );
  const [customWallpapers, setCustomWallpapers] = useState<string[]>([]);
  
  const activePreset = useThemeStore((state) => state.osStyle);
  const setPreset = useThemeStore((state) => state.setOsStyle);

  // Load initial theme, wallpaper and custom wallpapers from backend DB on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefs = profileManager.getPreferences();
      if (prefs) {
        if (prefs.theme) {
          const loadedTheme = prefs.theme as Theme;
          setThemeState(loadedTheme);
          // Sync with preset store
          let nextPreset: OSStyle = "win95-retro";
          if (loadedTheme === "light" || loadedTheme === "iris-light") {
            nextPreset = "win11";
          } else if (loadedTheme === "glass" || loadedTheme === "fluent-glass") {
            nextPreset = "win7-aero";
          } else if (loadedTheme === "retro-mac") {
            nextPreset = "macos";
          }
          setPreset(nextPreset);
        }
        if (prefs.wallpaper) setWallpaperState(prefs.wallpaper);
      }
      
      // Sync from backend
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (data.theme) {
              const fetchedTheme = data.theme as Theme;
              setThemeState(fetchedTheme);
              let nextPreset: OSStyle = "win95-retro";
              if (fetchedTheme === "light" || fetchedTheme === "iris-light") {
                nextPreset = "win11";
              } else if (fetchedTheme === "glass" || fetchedTheme === "fluent-glass") {
                nextPreset = "win7-aero";
              } else if (fetchedTheme === "retro-mac") {
                nextPreset = "macos";
              }
              setPreset(nextPreset);
            }
            if (data.wallpaper) setWallpaperState(data.wallpaper);
            if (data.customWallpapers) setCustomWallpapers(data.customWallpapers);
            profileManager.updatePreferences(data);
          }
        })
        .catch((err) => console.error("Settings backend sync failed:", err));
    }
  }, [setPreset]);

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

  // Sync theme to profileManager preferences and useThemeStore
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    // Map newTheme strictly to the type required by profileManager
    let prefTheme: "light" | "dark" | "oled" | "custom" = "dark";
    if (newTheme === "light" || newTheme === "iris-light") {
      prefTheme = "light";
    } else if (newTheme === "oled") {
      prefTheme = "oled";
    } else if (newTheme === "glass" || newTheme === "fluent-glass" || newTheme === "retro-mac") {
      prefTheme = "custom";
    }
    profileManager.updatePreferences({ theme: prefTheme });
    
    // Map legacy themes to new presets
    let nextPreset: OSStyle = "win95-retro";
    if (newTheme === "light" || newTheme === "iris-light") {
      nextPreset = "win11";
    } else if (newTheme === "glass" || newTheme === "fluent-glass") {
      nextPreset = "win7-aero";
    } else if (newTheme === "retro-mac") {
      nextPreset = "macos";
    }
    setPreset(nextPreset);

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
    
    // Resolve color variables based on the active preset
    let colors = {
      background: "#008080",
      foreground: "#000000",
      secondary: "#808080",
      accent: "#000080",
      border: "#808080",
      card: "#c0c0c0",
    };

    if (activePreset === "win7-aero") {
      colors = {
        background: "#091522",
        foreground: "#ffffff",
        secondary: "#94a3b8",
        accent: "#0ea5e9",
        border: "rgba(255, 255, 255, 0.2)",
        card: "rgba(255, 255, 255, 0.08)",
      };
    } else if (activePreset === "macos") {
      colors = {
        background: "#161617",
        foreground: "#f5f5f7",
        secondary: "#86868b",
        accent: "#0071e3",
        border: "#323236",
        card: "#1e1e1f",
      };
    } else if (activePreset === "win11") {
      colors = {
        background: "#f4f4f5",
        foreground: "#09090b",
        secondary: "#71717a",
        accent: "#2563eb",
        border: "#e4e4e7",
        card: "#ffffff",
      };
    } else if (activePreset === "win95-retro") {
      colors = {
        background: "#008080",
        foreground: "#000000",
        secondary: "#808080",
        accent: "#000080",
        border: "#808080",
        card: "#c0c0c0",
      };
    }

    // Determine the active wallpaper to apply
    const isCustomWallpaper = wallpaper.startsWith("data:") || customWallpapers.includes(wallpaper);
    let resolvedWallpaper = wallpaper;

    if (!isCustomWallpaper) {
      if (activePreset === "win7-aero") {
        resolvedWallpaper = "radial-gradient(circle at 80% 20%, #3b82f6 0%, #1d4ed8 50%, #1e3a8a 100%)";
      } else if (activePreset === "macos") {
        resolvedWallpaper = "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)";
      } else if (activePreset === "win11") {
        resolvedWallpaper = "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)";
      } else if (activePreset === "win95-retro") {
        resolvedWallpaper = "#008080";
      } else {
        resolvedWallpaper = "#008080";
      }
    }

    // Apply color values to CSS custom variables
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--text", colors.foreground);
    root.style.setProperty("--muted", colors.secondary);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--surface", colors.card);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--wallpaper", resolvedWallpaper);

    // Apply custom theme cursor
    const activeThemePresetObj = themePresets[theme] || themePresets["iris-dark"];
    root.style.cursor = activeThemePresetObj.cursor || "default";

    // Set dataset theme attribute for tailwind / ad-hoc styles
    root.setAttribute("data-theme", activePreset);
    
    // Add glass helper classes if theme is glass
    if (activePreset === "win7-aero") {
      root.classList.add("theme-glass");
    } else {
      root.classList.remove("theme-glass");
    }
  }, [activePreset, theme, wallpaper, customWallpapers]);

  // Global click listener to play click sounds
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleGlobalClick = () => {
      const activePresetObj = themePresets[theme];
      if (activePresetObj && activePresetObj.soundPack === "synthetic") {
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
