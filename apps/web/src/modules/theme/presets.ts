import { ThemeConfig } from "./types";

export const themePresets: Record<string, ThemeConfig> = {
  windows11: {
    name: "windows11",
    displayName: "Windows 11",
    colors: {
      background: "#0d0d10",
      foreground: "#f5f5f7",
      primary: "#f5f5f7",
      secondary: "#a1a1aa",
      accent: "#3b82f6",
      muted: "#1c1c21",
      border: "#2a2a30",
      card: "#17171b",
    },
    iconPack: "modern",
    cursor: "default",
    wallpaper: "linear-gradient(135deg, #0f1220 0%, #060608 100%)",
    soundPack: "synthetic",
    shellStyle: "win11",
    mode: "dark",
  },
  "windows7-aero": {
    name: "windows7-aero",
    displayName: "Windows 7 Aero",
    colors: {
      background: "#0b1522",
      foreground: "#ffffff",
      primary: "#ffffff",
      secondary: "#a8c5e0",
      accent: "#2a8fd8",
      muted: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.18)",
      card: "rgba(20,40,65,0.55)",
    },
    iconPack: "aero",
    cursor: "default",
    wallpaper: "radial-gradient(circle at 50% 30%, #1a4d8f 0%, #0a1a30 70%)",
    soundPack: "synthetic",
    shellStyle: "win7-aero",
    mode: "dark",
    glass: true,
  },
  glass: {
    name: "glass",
    displayName: "Iris Glass",
    colors: {
      background: "#0b0b12",
      foreground: "#f5f4ff",
      primary: "#f5f4ff",
      secondary: "#b9b6d6",
      accent: "#a78bfa",
      muted: "rgba(255,255,255,0.05)",
      border: "rgba(255,255,255,0.14)",
      card: "rgba(24,22,38,0.45)",
    },
    // Deliberately "modern" (plain glyph icons) — glass only affects
    // windows/taskbar surfaces, never icons.
    iconPack: "modern",
    cursor: "default",
    wallpaper:
      "radial-gradient(circle at 20% 15%, rgba(139,92,246,0.35) 0%, rgba(11,11,18,0) 45%), radial-gradient(circle at 85% 80%, rgba(56,189,248,0.25) 0%, rgba(11,11,18,0) 50%), linear-gradient(160deg, #14121f 0%, #08080d 100%)",
    soundPack: "synthetic",
    shellStyle: "win11",
    mode: "dark",
    glass: true,
  },
};
