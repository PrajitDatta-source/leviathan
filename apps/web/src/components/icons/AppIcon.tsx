"use client";

import React from "react";
import { iconPackRegistry, useIconTheme } from "@/modules/icons/IconThemeContext";

interface AppIconProps {
  appId: string;
  size?: number;
  className?: string;
}

/**
 * Renders an app icon using the active icon pack (Windows 11, Windows 7,
 * KDE, macOS, Papirus, or Iris Glass). The icon pack is driven by the
 * active theme's `iconPack` field (see modules/theme/presets.ts), or by an
 * explicit user override set in Settings -> Appearance.
 *
 * This intentionally does NOT branch on shell style (win11/macos/etc) —
 * icon pack and window-chrome shell are independent choices, matching how
 * the theme presets themselves describe them.
 */
export function AppIcon({ appId, size = 48, className = "" }: AppIconProps) {
  const { iconTheme } = useIconTheme();
  const pack = iconPackRegistry.get(iconTheme) || iconPackRegistry.get("windows11");

  if (!pack) {
    // Should be unreachable since windows11 is always registered, but keep
    // a harmless fallback so a missing pack never crashes the shell.
    return <div style={{ width: size, height: size }} className={className} />;
  }

  return <>{pack.renderIcon(appId, size, className)}</>;
}
