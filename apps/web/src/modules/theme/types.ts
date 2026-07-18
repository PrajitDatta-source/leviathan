export type Theme = "light" | "dark" | "oled" | "custom";

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
