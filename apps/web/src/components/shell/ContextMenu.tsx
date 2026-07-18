"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/modules/theme/ThemeContext";
import { Theme } from "@/modules/theme/types";
import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";
import { createElement } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const { setTheme, theme: currentTheme } = useTheme();
  const manager = useWindowManager();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    onClose();
  };

  const handleOpenSettings = () => {
    const app = appRegistry.get("settings");
    if (app) {
      manager.open({
        id: "settings",
        title: app.title,
        content: createElement(app.component),
        x: 150,
        y: 150,
        width: app.width || 700,
        height: app.height || 500,
      });
    }
    onClose();
  };

  const handleCloseAllWindows = () => {
    manager.windows.forEach((win) => manager.close(win.id));
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[200px] rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none text-sm text-zinc-200"
      style={{ left: x, top: y }}
    >
      <button
        onClick={handleOpenSettings}
        className="flex w-full items-center rounded-lg px-3 py-2 text-left hover:bg-zinc-800 transition"
      >
        <span>System Settings</span>
      </button>

      <button
        onClick={handleCloseAllWindows}
        className="flex w-full items-center rounded-lg px-3 py-2 text-left hover:bg-zinc-800 transition"
      >
        <span>Close All Windows</span>
      </button>

      <div className="my-1.5 border-t border-zinc-800/80" />

      {/* Submenu for Themes */}
      <div className="relative group px-3 py-2 rounded-lg hover:bg-zinc-800 transition cursor-default flex items-center justify-between">
        <span>Change Theme</span>
        <span className="text-xs text-zinc-500">▶</span>

        <div className="absolute left-[calc(100%-4px)] top-0 hidden group-hover:block min-w-[160px] rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in slide-in-from-left-2 duration-100">
          {(["light", "dark", "oled", "glass"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-800 transition capitalized ${
                currentTheme === t ? "text-violet-400 font-medium" : ""
              }`}
            >
              <span className="capitalize">{t}</span>
              {currentTheme === t && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="my-1.5 border-t border-zinc-800/80" />

      <button
        onClick={() => {
          window.location.reload();
        }}
        className="flex w-full items-center rounded-lg px-3 py-2 text-left hover:bg-zinc-800 transition"
      >
        <span>Reload OS</span>
      </button>
    </div>
  );
}
