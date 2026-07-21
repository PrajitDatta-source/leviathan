import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OSStyle = 'win11' | 'win7-aero' | 'win95-retro' | 'macos' | 'iris-glass';
export type ColorMode = 'dark' | 'light';

interface ThemeState {
  osStyle: OSStyle;
  colorMode: ColorMode;
  wallpaper: string;
  setOsStyle: (style: OSStyle) => void;
  setColorMode: (mode: ColorMode) => void;
  setWallpaper: (url: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      osStyle: 'win11',
      colorMode: 'dark',
      wallpaper: '', // Empty string triggers OS-default wallpaper fallbacks in AppShell
      setOsStyle: (osStyle) => set({ osStyle }),
      setColorMode: (colorMode) => set({ colorMode }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
    }),
    {
      name: 'iris-theme-storage',
    }
  )
);
