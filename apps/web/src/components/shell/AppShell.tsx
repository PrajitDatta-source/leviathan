"use client";

import { useEffect, useState, createElement } from "react";

import { Taskbar } from "./Taskbar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { Desktop } from "@/components/window/Desktop";
import { ContextMenu } from "./ContextMenu";
import { DesktopIcons } from "./DesktopIcons";

import { bootstrap } from "@/core/bootstrap";
import { WindowManagerProvider } from "@/core/window/manager";
import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";
import { useTheme } from "@/modules/theme/ThemeContext";
import { loadShortcutsConfig, getShortcutCombination, matchesEvent } from "@/core/window/shortcuts";

// KeyboardManager component handles i3-inspired keyboard shortcuts
function KeyboardManager({ setOpenPalette }: { setOpenPalette: (open: boolean) => void }) {
  const manager = useWindowManager();
  const [config, setConfig] = useState(() => loadShortcutsConfig());

  useEffect(() => {
    const handleConfigChange = () => {
      setConfig(loadShortcutsConfig());
    };
    window.addEventListener("shortcuts-changed", handleConfigChange);
    return () => window.removeEventListener("shortcuts-changed", handleConfigChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Load configurations
      const closeCombo = getShortcutCombination("close_window", config);
      const maximizeCombo = getShortcutCombination("toggle_maximize", config);
      const minimizeCombo = getShortcutCombination("minimize_window", config);
      const showDesktopCombo = getShortcutCombination("show_desktop", config);
      
      const nextWindowCombo = getShortcutCombination("next_window", config);
      const prevWindowCombo = getShortcutCombination("prev_window", config);
      
      const snapLeftCombo = getShortcutCombination("snap_left", config);
      const snapRightCombo = getShortcutCombination("snap_right", config);
      const snapUpCombo = getShortcutCombination("snap_up", config);
      const snapDownCombo = getShortcutCombination("snap_down", config);
      
      const moveLeftCombo = getShortcutCombination("move_left", config);
      const moveRightCombo = getShortcutCombination("move_right", config);
      const moveUpCombo = getShortcutCombination("move_up", config);
      const moveDownCombo = getShortcutCombination("move_down", config);
      
      const terminalCombo = getShortcutCombination("open_terminal", config);
      const explorerCombo = getShortcutCombination("open_explorer", config);
      const notesCombo = getShortcutCombination("open_notes", config);
      const settingsCombo = getShortcutCombination("open_settings", config);

      const focusedWindow = manager.windows.find(
        (w) => w.focused && w.workspace === manager.activeWorkspace
      );

      if (matchesEvent(closeCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          manager.close(focusedWindow.id);
        }
      } else if (matchesEvent(maximizeCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          if (focusedWindow.maximized) {
            manager.restore(focusedWindow.id);
          } else {
            manager.maximize(focusedWindow.id);
          }
        }
      } else if (matchesEvent(minimizeCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          manager.minimize(focusedWindow.id);
        }
      } else if (matchesEvent(showDesktopCombo, e)) {
        e.preventDefault();
        manager.toggleShowDesktop();
      } else if (matchesEvent(nextWindowCombo, e)) {
        e.preventDefault();
        const activeWindows = manager.windows.filter(
          (w) => w.workspace === manager.activeWorkspace && !w.minimized
        );
        if (activeWindows.length > 1) {
          const currentIndex = activeWindows.findIndex((w) => w.focused);
          const nextIndex = currentIndex < activeWindows.length - 1 ? currentIndex + 1 : 0;
          manager.focus(activeWindows[nextIndex].id);
        }
      } else if (matchesEvent(prevWindowCombo, e)) {
        e.preventDefault();
        const activeWindows = manager.windows.filter(
          (w) => w.workspace === manager.activeWorkspace && !w.minimized
        );
        if (activeWindows.length > 1) {
          const currentIndex = activeWindows.findIndex((w) => w.focused);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : activeWindows.length - 1;
          manager.focus(activeWindows[prevIndex].id);
        }
      } else if (matchesEvent(snapLeftCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          const sw = globalThis.innerWidth;
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          manager.updatePositionAndSize(focusedWindow.id, 0, 0, sw / 2, sh - taskbarHeight);
        }
      } else if (matchesEvent(snapRightCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          const sw = globalThis.innerWidth;
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          manager.updatePositionAndSize(focusedWindow.id, sw / 2, 0, sw / 2, sh - taskbarHeight);
        }
      } else if (matchesEvent(snapUpCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          manager.maximize(focusedWindow.id);
        }
      } else if (matchesEvent(snapDownCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          if (focusedWindow.maximized) {
            manager.restore(focusedWindow.id);
          } else {
            manager.minimize(focusedWindow.id);
          }
        }
      } else if (matchesEvent(moveLeftCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.maximized) {
          const sw = globalThis.innerWidth;
          const moveStep = 40;
          let newX = focusedWindow.x - moveStep;
          newX = Math.max(60 - focusedWindow.width, Math.min(sw - 60, newX));
          manager.updatePositionAndSize(focusedWindow.id, newX, focusedWindow.y, focusedWindow.width, focusedWindow.height);
        }
      } else if (matchesEvent(moveRightCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.maximized) {
          const sw = globalThis.innerWidth;
          const moveStep = 40;
          let newX = focusedWindow.x + moveStep;
          newX = Math.max(60 - focusedWindow.width, Math.min(sw - 60, newX));
          manager.updatePositionAndSize(focusedWindow.id, newX, focusedWindow.y, focusedWindow.width, focusedWindow.height);
        }
      } else if (matchesEvent(moveUpCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.maximized) {
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          const moveStep = 40;
          let newY = focusedWindow.y - moveStep;
          newY = Math.max(0, Math.min(sh - taskbarHeight - 40, newY));
          manager.updatePositionAndSize(focusedWindow.id, focusedWindow.x, newY, focusedWindow.width, focusedWindow.height);
        }
      } else if (matchesEvent(moveDownCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.maximized) {
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          const moveStep = 40;
          let newY = focusedWindow.y + moveStep;
          newY = Math.max(0, Math.min(sh - taskbarHeight - 40, newY));
          manager.updatePositionAndSize(focusedWindow.id, focusedWindow.x, newY, focusedWindow.width, focusedWindow.height);
        }
      } else if (matchesEvent(terminalCombo, e)) {
        e.preventDefault();
        openApp("terminal");
      } else if (matchesEvent(explorerCombo, e)) {
        e.preventDefault();
        openApp("explorer");
      } else if (matchesEvent(notesCombo, e)) {
        e.preventDefault();
        openApp("notes");
      } else if (matchesEvent(settingsCombo, e)) {
        e.preventDefault();
        openApp("settings");
      } else {
        // Match dynamic workspace combinations (workspace 1-9)
        for (let wNum = 1; wNum <= 9; wNum++) {
          const switchCombo = getShortcutCombination(`workspace_${wNum}`, config);
          const moveCombo = getShortcutCombination(`move_workspace_${wNum}`, config);
          
          if (matchesEvent(switchCombo, e)) {
            e.preventDefault();
            manager.setActiveWorkspace(wNum);
            break;
          }
          if (matchesEvent(moveCombo, e)) {
            e.preventDefault();
            if (focusedWindow) {
              manager.moveWindowToWorkspace(focusedWindow.id, wNum);
            }
            break;
          }
        }
      }
    };

    const openApp = (appId: string) => {
      const app = appRegistry.get(appId);
      if (app) {
        manager.open({
          id: appId,
          title: app.title,
          content: createElement(app.component),
          x: 100 + manager.windows.length * 25,
          y: 100 + manager.windows.length * 25,
          width: app.width || 700,
          height: app.height || 500,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [manager, setOpenPalette, config]);

  return null;
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    bootstrap();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleToggleEvent = () => {
      setOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("toggle-command-palette", handleToggleEvent);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("toggle-command-palette", handleToggleEvent);
    };
  }, []);

  const themeContext = useTheme();

  const handleContextMenu = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      const isInsideWindow = e.target.closest(".window-instance") || e.target.closest("button") || e.target.closest("input");
      if (isInsideWindow) return;
    }
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleLeftClick = () => {
    if (contextMenu) {
      setContextMenu(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUri = event.target?.result as string;
        themeContext.setWallpaper(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <WindowManagerProvider>
      <div 
        onContextMenu={handleContextMenu}
        onClick={handleLeftClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="h-screen w-screen relative overflow-hidden select-none"
        style={{ background: "var(--wallpaper)" }}
      >
        {/* Keyboard OS Action interceptor */}
        <KeyboardManager setOpenPalette={setOpen} />

        {/* Desktop shortcuts / background icons */}
        <DesktopIcons />

        {/* Active Desktop Windows */}
        <Desktop />

        {/* System Taskbar */}
        <Taskbar />

        {/* Hotkey Command Search */}
        <CommandPalette
          open={open}
          onOpenChange={setOpen}
        />

        {/* Global Right Click Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    </WindowManagerProvider>
  );
}