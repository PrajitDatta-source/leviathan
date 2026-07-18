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

// KeyboardManager component handles i3-inspired keyboard shortcuts
function KeyboardManager({ setOpenPalette }: { setOpenPalette: (open: boolean) => void }) {
  const manager = useWindowManager();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Super (metaKey/Command) or Alt (altKey) as modifiers
      const modifier = e.metaKey || e.altKey;
      if (!modifier) return;

      const key = e.key.toLowerCase();

      // Super + D -> Command Palette
      if (key === "d") {
        e.preventDefault();
        setOpenPalette(true);
      }

      // App Launchers: Super + Enter -> Terminal, Super + E -> Explorer, Super + N -> Notes, Super + S -> Settings
      if (e.key === "Enter") {
        e.preventDefault();
        openApp("terminal");
      }
      if (key === "e") {
        e.preventDefault();
        openApp("explorer");
      }
      if (key === "n") {
        e.preventDefault();
        openApp("notes");
      }
      if (key === "s") {
        e.preventDefault();
        openApp("settings");
      }

      // Find focused window on current workspace for window control hotkeys
      const focusedWindow = manager.windows.find(
        (w) => w.focused && w.workspace === manager.activeWorkspace
      );

      // Super + Q -> Close window
      if (key === "q") {
        e.preventDefault();
        if (focusedWindow) {
          manager.close(focusedWindow.id);
        }
      }

      // Super + Space -> Toggle Maximize/Restore
      if (key === " ") {
        e.preventDefault();
        if (focusedWindow) {
          if (focusedWindow.maximized) {
            manager.restore(focusedWindow.id);
          } else {
            manager.maximize(focusedWindow.id);
          }
        }
      }

      // Super + Shift + Arrow keys -> Move window
      if (e.shiftKey && ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.maximized) {
          const moveStep = 40;
          let newX = focusedWindow.x;
          let newY = focusedWindow.y;
          if (key === "arrowleft") newX -= moveStep;
          if (key === "arrowright") newX += moveStep;
          if (key === "arrowup") newY -= moveStep;
          if (key === "arrowdown") newY += moveStep;
          manager.updatePositionAndSize(focusedWindow.id, newX, newY, focusedWindow.width, focusedWindow.height);
        }
      }

      // Super + Arrow keys -> Focus adjacent window
      if (!e.shiftKey && (key === "arrowleft" || key === "arrowright")) {
        e.preventDefault();
        const activeWindows = manager.windows.filter(
          (w) => w.workspace === manager.activeWorkspace && !w.minimized
        );
        if (activeWindows.length > 1) {
          const currentIndex = activeWindows.findIndex((w) => w.focused);
          let nextIndex = currentIndex;
          if (key === "arrowleft") {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : activeWindows.length - 1;
          } else {
            nextIndex = currentIndex < activeWindows.length - 1 ? currentIndex + 1 : 0;
          }
          manager.focus(activeWindows[nextIndex].id);
        }
      }

      // Super + 1-4 -> Workspace switching & movement
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        const workspaceNum = parseInt(e.key);
        if (e.shiftKey) {
          if (focusedWindow) {
            manager.moveWindowToWorkspace(focusedWindow.id, workspaceNum);
          }
        } else {
          manager.setActiveWorkspace(workspaceNum);
        }
      }

      // Super + Tab -> Switch window focus
      if (e.key === "Tab") {
        e.preventDefault();
        const activeWindows = manager.windows.filter(
          (w) => w.workspace === manager.activeWorkspace && !w.minimized
        );
        if (activeWindows.length > 1) {
          const currentIndex = activeWindows.findIndex((w) => w.focused);
          let nextIndex = currentIndex;
          if (e.shiftKey) {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : activeWindows.length - 1;
          } else {
            nextIndex = currentIndex < activeWindows.length - 1 ? currentIndex + 1 : 0;
          }
          manager.focus(activeWindows[nextIndex].id);
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [manager, setOpenPalette]);

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

  return (
    <WindowManagerProvider>
      <div 
        onContextMenu={handleContextMenu}
        onClick={handleLeftClick}
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