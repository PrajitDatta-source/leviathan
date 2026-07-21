export type Theme = 
  | "iris-dark"
  | "iris-light"
  | "iris-glass"
  | "fluent-glass"
  | "retro-mac"
  | "material-design"
  | "light"
  | "dark"
  | "oled"
  | "glass"
  | "nord"
  | "catppuccin"
  | "tokyonight"
  | "dracula"
  | "gruvbox";

// The four legacy window-chrome / taskbar "shell" families, plus the new
// refined glass shell. Every theme preset below maps onto exactly one of
// these so that taskbar, window chrome and desktop icons always have a
// well-defined layout to render, no matter which color theme is active.
export type ShellStyle = "win11" | "win7-aero" | "win95-retro" | "macos" | "iris-glass";

export interface ThemeConfig {
  name: Theme;
  displayName: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
    card: string;
  };
  iconPack: string; // e.g. "windows11", "windows7", "kde", "macos", "papirus", "iris"
  cursor?: string;   // e.g. "default", "crosshair", "text"
  wallpaper: string; // Default background color or gradient
  soundPack?: "synthetic" | "none";
  /** Which taskbar/window-chrome layout family this theme uses. */
  shellStyle: ShellStyle;
  /** Whether this theme reads as light or dark, for chrome contrast rules. */
  mode: "light" | "dark";
  /** True for themes that want frosted glass surfaces (blur + translucency). */
  glass?: boolean;
}
