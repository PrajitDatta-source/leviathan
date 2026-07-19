import { create } from "zustand";

export type ThemePreset = "aero-glass" | "macos" | "neon-dark" | "clean-light";

export interface ThemeStoreState {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
}

const getInitialTheme = (): ThemePreset => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("iris_active_theme");
    if (saved === "neon-dark" || saved === "aero-glass" || saved === "macos" || saved === "clean-light") {
      return saved;
    }
  }
  return "neon-dark";
};

export const useThemeStore = create<ThemeStoreState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      localStorage.setItem("iris_active_theme", theme);
    }
  },
}));
