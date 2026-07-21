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

// Resolve a theme name safely, always falling back to iris-dark if the
// stored/fetched value doesn't match a known preset (e.g. after a preset
// was renamed or removed).
function resolvePreset(theme: Theme) {
  return themePresets[theme] || themePresets["iris-dark"];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("iris-dark");
  const [wallpaper, setWallpaperState] = useState<string>(
    themePresets["iris-dark"].wallpaper
  );
  const [customWallpapers, setCustomWallpapers] = useState<string[]>([]);
  
  const setPreset = useThemeStore((state) => state.setOsStyle);
  const setColorMode = useThemeStore((state) => state.setColorMode);

  // Keep the lightweight shell-family store (osStyle/colorMode) in sync
  // with whatever the active rich theme preset declares. This is the only
  // place that maps theme -> shell so Taskbar/Window/AppIcon never disagree.
  const syncShellFromTheme = (t: Theme) => {
    const preset = resolvePreset(t);
    setPreset(preset.shellStyle as OSStyle);
    setColorMode(preset.mode);
  };

  // Load initial theme, wallpaper and custom wallpapers from backend DB on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefs = profileManager.getPreferences();
      if (prefs) {
        if (prefs.theme) {
          const loadedTheme = prefs.theme as Theme;
          setThemeState(loadedTheme);
          syncShellFromTheme(loadedTheme);
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
              syncShellFromTheme(fetchedTheme);
            }
            if (data.wallpaper) setWallpaperState(data.wallpaper);
            if (data.customWallpapers) setCustomWallpapers(data.customWallpapers);
            profileManager.updatePreferences(data);
          }
        })
        .catch((err) => console.error("Settings backend sync failed:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Switch the active theme. This is the single entry point that updates
  // the rich color preset, the derived shell family, and the wallpaper.
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    const preset = resolvePreset(newTheme);

    // profileManager only understands a narrower legacy vocabulary; map
    // onto it for anything that reads preferences.theme directly.
    let prefTheme: "light" | "dark" | "oled" | "custom" = preset.mode;
    if (newTheme === "oled") prefTheme = "oled";
    else if (preset.glass || !["light", "dark", "iris-light", "iris-dark"].includes(newTheme)) {
      prefTheme = "custom";
    }
    profileManager.updatePreferences({ theme: prefTheme });

    syncShellFromTheme(newTheme);

    // Automatically apply theme's default wallpaper
    let nextWp = wallpaper;
    if (preset.wallpaper) {
      nextWp = preset.wallpaper;
      setWallpaperState(preset.wallpaper);
      profileManager.updatePreferences({ wallpaper: preset.wallpaper });
    }

    // Play startup sound if configured in theme
    if (preset.soundPack === "synthetic") {
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
      nextWp = resolvePreset(theme).wallpaper;
      setWallpaperState(nextWp);
      profileManager.updatePreferences({ wallpaper: nextWp });
    }
    
    pushSettingsToBackend(theme, nextWp, updated);
  };

  // Apply the active preset's colors, wallpaper and cursor straight to CSS
  // custom properties. This used to be hardcoded to only 4 shell families
  // and ignored each preset's actual `colors`/`wallpaper` — every one of
  // the 15 themes now applies its own real palette.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const preset = resolvePreset(theme);
    const { colors } = preset;

    const isCustomWallpaper = wallpaper.startsWith("data:") || customWallpapers.includes(wallpaper);
    const resolvedWallpaper = wallpaper || preset.wallpaper;

    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--text", colors.foreground);
    root.style.setProperty("--muted", colors.secondary);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--surface", colors.card);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--wallpaper", resolvedWallpaper);
    // Extra variables the glass/iris themes lean on for specular sheen.
    root.style.setProperty("--surface-muted", colors.muted);
    root.style.setProperty("--primary", colors.primary);

    root.style.cursor = preset.cursor || "default";
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-shell", preset.shellStyle);
    root.setAttribute("data-mode", preset.mode);

    if (preset.glass) {
      root.classList.add("theme-glass");
    } else {
      root.classList.remove("theme-glass");
    }

    void isCustomWallpaper; // reserved for future custom-wallpaper-specific rules
  }, [theme, wallpaper, customWallpapers]);

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
