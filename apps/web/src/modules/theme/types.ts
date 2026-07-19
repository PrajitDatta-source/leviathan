export type Theme = 
  | "iris-dark"
  | "iris-light"
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
  iconPack: string; // e.g. "flat", "fluent", "classic", "material"
  cursor?: string;   // e.g. "default", "crosshair", "text"
  wallpaper: string; // Default background color or gradient
  soundPack?: "synthetic" | "none";
}
