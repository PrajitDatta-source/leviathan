import { ThemeConfig } from "./types";

export const themePresets: Record<string, ThemeConfig> = {
  light: {
    name: "light",
    displayName: "Light",
    colors: {
      background: "#ffffff",
      foreground: "#0a0a0a",
      primary: "#0a0a0a",
      secondary: "#737373",
      accent: "#2563eb",
      muted: "#f5f5f5",
      border: "#e5e5e5",
      card: "#ffffff",
    },
  },
  dark: {
    name: "dark",
    displayName: "Dark",
    colors: {
      background: "#09090b",
      foreground: "#fafafa",
      primary: "#fafafa",
      secondary: "#a1a1aa",
      accent: "#3b82f6",
      muted: "#27272a",
      border: "#27272a",
      card: "#18181b",
    },
  },
  oled: {
    name: "oled",
    displayName: "OLED",
    colors: {
      background: "#000000",
      foreground: "#ffffff",
      primary: "#ffffff",
      secondary: "#888888",
      accent: "#4f8aff",
      muted: "#111111",
      border: "#111111",
      card: "#000000",
    },
  },
};
