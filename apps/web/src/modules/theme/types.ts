export type Theme = "light" | "dark" | "oled" | "glass" | "nord" | "catppuccin" | "tokyonight" | "dracula" | "gruvbox" | "custom";

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
}

export interface CustomTheme extends ThemeConfig {
  name: "custom";
  id: string;
}
