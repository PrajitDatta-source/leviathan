import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OSStyle = 'win11' | 'win7-aero';
export type ColorMode = 'dark' | 'light';

interface ThemeState {
  osStyle: OSStyle;
  colorMode: ColorMode;
  wallpaper: string;
  /** True only for the Glass theme — lets window chrome/taskbar opt into
   * extra blur/translucency without needing a whole separate shell family. */
  glass: boolean;
  setOsStyle: (style: OSStyle) => void;
  setColorMode: (mode: ColorMode) => void;
  setWallpaper: (url: string) => void;
  setGlass: (glass: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      osStyle: 'win11',
      colorMode: 'dark',
      wallpaper: '', // Empty string triggers OS-default wallpaper fallbacks in AppShell
      glass: false,
      setOsStyle: (osStyle) => set({ osStyle }),
      setColorMode: (colorMode) => set({ colorMode }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setGlass: (glass) => set({ glass }),
    }),
    {
      name: 'iris-theme-storage',
    }
  )
);
