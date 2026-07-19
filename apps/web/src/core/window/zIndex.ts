/**
 * zIndex.ts
 * Centralized z-index layers for the Iris Web OS.
 * Prevents z-index conflicts by defining layers in a single source of truth.
 */
export const Z_INDEX = {
  DESKTOP_BACKGROUND: 0,
  DESKTOP_ICONS: 10,
  WINDOWS_BASE: 100,
  ACTIVE_WINDOW_BASE: 110,
  CONTEXT_MENUS: 500,
  COMMAND_PALETTE: 800,
  NOTIFICATIONS: 900,
  DIALOGS: 1000,
} as const;
