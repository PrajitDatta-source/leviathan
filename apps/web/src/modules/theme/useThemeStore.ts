import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OSStyle = 'win11' | 'win7-aero' | 'win95-retro' | 'macos';
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
      wallpaper: '#0a0a0c', // Default cyber dark background
      setOsStyle: (osStyle) => set({ osStyle }),
      setColorMode: (colorMode) => set({ colorMode }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
    }),
    {
      name: 'iris-theme-storage',
    }
  )
);
