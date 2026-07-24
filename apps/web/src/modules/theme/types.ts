// Cut down again per explicit request: just three themes now — Windows 11,
// Windows 7 Aero, and Iris Glass. No separate Light/Dark, no separate icon
// picker — each theme owns its own icon look, full stop.
export type Theme = "windows11" | "windows7-aero" | "glass";

// Two taskbar/window-chrome layouts. Glass reuses the Windows 11 layout
// (it's a material/color variation of it — extra blur/translucency, not a
// different structure) with its own icon pack.
export type ShellStyle = "win11" | "win7-aero";

// One icon pack per shell family — "modern" (flat glyph, no background
// chip) covers both Windows 11 and Glass, since Glass's frosted treatment
// applies to windows/taskbar surfaces only, never to icons. "aero" is the
// glossy chip look, kept only for Windows 7 Aero. Icons are never
// user-selectable separately from the theme.
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
  /** True only for the Glass theme's frosted, translucent window/taskbar
   * surfaces. Deliberately never affects icon rendering — icons for Glass
   * use the plain "glass" pack, which is flat/sharp, not frosted. */
  glass?: boolean;
}
