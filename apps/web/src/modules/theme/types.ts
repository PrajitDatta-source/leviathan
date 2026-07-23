// Cut down from 15 themes / 5 shell families to exactly what was asked
// for: Windows 11, Windows 7 Aero, Light, Dark, Glass. Fewer, better,
// each one actually distinct instead of 10 near-duplicate dark palettes.
export type Theme = "windows11" | "windows7-aero" | "light" | "dark" | "glass";

// Only two real taskbar/window-chrome layouts now. Light, Dark and Glass
// all use the modern "win11" layout (they're color/material variations of
// the same shell) — Windows 7 Aero is the one genuinely different layout.
export type ShellStyle = "win11" | "win7-aero";

// Only two icon languages: "modern" (flat glyph, no background tile —
// used by Windows 11 / Light / Dark / Glass) and "aero" (glossy 3D chip,
// used only by Windows 7 Aero for period-correct nostalgia). Icons are
// intentionally decoupled from `glass` — a glass-surfaced theme still
// renders plain glyph icons, not frosted ones.
export type IconPack = "modern" | "aero";

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
  iconPack: IconPack;
  cursor?: string;
  wallpaper: string;
  soundPack?: "synthetic" | "none";
  shellStyle: ShellStyle;
  mode: "light" | "dark";
  /** True for the Glass theme's frosted, translucent surfaces. Never
   * affects icon rendering — see IconPack above. */
  glass?: boolean;
}
