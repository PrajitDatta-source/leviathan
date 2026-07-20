"use client";

import { useEffect, useState } from "react";

import { Taskbar } from "./Taskbar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { Desktop } from "@/components/window/Desktop";
import { ContextMenu } from "./ContextMenu";
import { DesktopIcons } from "./DesktopIcons";

import { bootstrap } from "@/core/bootstrap";
import { WindowManagerProvider, useWindowStore, useWorkspaceStore, openWindow, closeWindow, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, toggleShowDesktop } from "@/core/window/manager";
import { useTheme } from "@/modules/theme/ThemeContext";
import { loadShortcutsConfig, getShortcutCombination, matchesEvent } from "@/core/window/shortcuts";
import { useThemeStore } from "@/core/theme/useThemeStore";
import { Wifi, Battery } from "lucide-react";

// KeyboardManager component handles i3-inspired keyboard shortcuts
function KeyboardManager({ setOpenPalette }: { setOpenPalette: (open: boolean) => void }) {
  const windows = useWindowStore((state) => state.windows);
  const windowWorkspaces = useWorkspaceStore((state) => state.windowWorkspaces);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
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

      const activeWindowId = useWindowStore.getState().activeWindowId;
      const focusedWindow = activeWindowId && windows[activeWindowId] && windowWorkspaces[activeWindowId] === activeWorkspace && !windows[activeWindowId].isMinimized
        ? windows[activeWindowId]
        : undefined;

      if (matchesEvent(closeCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          closeWindow(focusedWindow.id);
        }
      } else if (matchesEvent(maximizeCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          if (focusedWindow.isMaximized) {
            restoreWindow(focusedWindow.id);
          } else {
            maximizeWindow(focusedWindow.id);
          }
        }
      } else if (matchesEvent(minimizeCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          minimizeWindow(focusedWindow.id);
        }
      } else if (matchesEvent(showDesktopCombo, e)) {
        e.preventDefault();
        toggleShowDesktop();
      } else if (matchesEvent(nextWindowCombo, e)) {
        e.preventDefault();
        const activeWindows = Object.values(windows).filter(
          (w) => windowWorkspaces[w.id] === activeWorkspace && !w.isMinimized
        );
        if (activeWindows.length > 1) {
          const currentIndex = activeWindows.findIndex((w) => w.isFocused);
          const nextIndex = currentIndex < activeWindows.length - 1 ? currentIndex + 1 : 0;
          focusWindow(activeWindows[nextIndex].id);
        }
      } else if (matchesEvent(prevWindowCombo, e)) {
        e.preventDefault();
        const activeWindows = Object.values(windows).filter(
          (w) => windowWorkspaces[w.id] === activeWorkspace && !w.isMinimized
        );
        if (activeWindows.length > 1) {
          const currentIndex = activeWindows.findIndex((w) => w.isFocused);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : activeWindows.length - 1;
          focusWindow(activeWindows[prevIndex].id);
        }
      } else if (matchesEvent(snapLeftCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          const sw = globalThis.innerWidth;
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          useWindowStore.getState().updatePosition(focusedWindow.id, { x: 0, y: 0 });
          useWindowStore.getState().updateSize(focusedWindow.id, { width: sw / 2, height: sh - taskbarHeight });
        }
      } else if (matchesEvent(snapRightCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          const sw = globalThis.innerWidth;
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          useWindowStore.getState().updatePosition(focusedWindow.id, { x: sw / 2, y: 0 });
          useWindowStore.getState().updateSize(focusedWindow.id, { width: sw / 2, height: sh - taskbarHeight });
        }
      } else if (matchesEvent(snapUpCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          maximizeWindow(focusedWindow.id);
        }
      } else if (matchesEvent(snapDownCombo, e)) {
        e.preventDefault();
        if (focusedWindow) {
          if (focusedWindow.isMaximized) {
            restoreWindow(focusedWindow.id);
          } else {
            minimizeWindow(focusedWindow.id);
          }
        }
      } else if (matchesEvent(moveLeftCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.isMaximized) {
          const sw = globalThis.innerWidth;
          const moveStep = 40;
          let newX = focusedWindow.position.x - moveStep;
          newX = Math.max(60 - focusedWindow.size.width, Math.min(sw - 60, newX));
          useWindowStore.getState().updatePosition(focusedWindow.id, { x: newX, y: focusedWindow.position.y });
        }
      } else if (matchesEvent(moveRightCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.isMaximized) {
          const sw = globalThis.innerWidth;
          const moveStep = 40;
          let newX = focusedWindow.position.x + moveStep;
          newX = Math.max(60 - focusedWindow.size.width, Math.min(sw - 60, newX));
          useWindowStore.getState().updatePosition(focusedWindow.id, { x: newX, y: focusedWindow.position.y });
        }
      } else if (matchesEvent(moveUpCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.isMaximized) {
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          const moveStep = 40;
          let newY = focusedWindow.position.y - moveStep;
          newY = Math.max(0, Math.min(sh - taskbarHeight - 40, newY));
          useWindowStore.getState().updatePosition(focusedWindow.id, { x: focusedWindow.position.x, y: newY });
        }
      } else if (matchesEvent(moveDownCombo, e)) {
        e.preventDefault();
        if (focusedWindow && !focusedWindow.isMaximized) {
          const sh = globalThis.innerHeight;
          const taskbarHeight = 48;
          const moveStep = 40;
          let newY = focusedWindow.position.y + moveStep;
          newY = Math.max(0, Math.min(sh - taskbarHeight - 40, newY));
          useWindowStore.getState().updatePosition(focusedWindow.id, { x: focusedWindow.position.x, y: newY });
        }
      } else if (matchesEvent(terminalCombo, e)) {
        e.preventDefault();
        openWindow("terminal");
      } else if (matchesEvent(explorerCombo, e)) {
        e.preventDefault();
        openWindow("explorer");
      } else if (matchesEvent(notesCombo, e)) {
        e.preventDefault();
        openWindow("notes");
      } else if (matchesEvent(settingsCombo, e)) {
        e.preventDefault();
        openWindow("settings");
      } else {
        // Match dynamic workspace combinations (workspace 1-5)
        for (let wNum = 1; wNum <= 5; wNum++) {
          const switchCombo = getShortcutCombination(`workspace_${wNum}`, config);
          const moveCombo = getShortcutCombination(`move_workspace_${wNum}`, config);
          
          if (matchesEvent(switchCombo, e)) {
            e.preventDefault();
            useWorkspaceStore.getState().setActiveWorkspace(wNum);
            break;
          }
          if (matchesEvent(moveCombo, e)) {
            e.preventDefault();
            if (focusedWindow) {
              useWorkspaceStore.getState().moveWindowToWorkspace(focusedWindow.id, wNum);
            }
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [windows, windowWorkspaces, activeWorkspace, setOpenPalette, config]);

  return null;
}

function MacTopBar() {
  const [time, setTime] = useState(new Date());
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const windows = useWindowStore((state) => state.windows);
  const activeWindow = activeWindowId ? windows[activeWindowId] : null;
  const currentAppName = activeWindow ? activeWindow.title : "Finder";

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-6 bg-zinc-900/75 backdrop-blur-md text-white border-b border-white/5 flex items-center justify-between px-4 text-xs font-semibold select-none z-[100]">
      <div className="flex items-center gap-4">
        {/* Apple/Iris logo */}
        <span className="text-sm font-bold text-zinc-100 cursor-default"></span>
        <span className="font-bold text-zinc-100">{currentAppName}</span>
        <span className="text-zinc-400 font-normal cursor-pointer hover:text-white">File</span>
        <span className="text-zinc-400 font-normal cursor-pointer hover:text-white">Edit</span>
        <span className="text-zinc-400 font-normal cursor-pointer hover:text-white">View</span>
        <span className="text-zinc-400 font-normal cursor-pointer hover:text-white">Go</span>
        <span className="text-zinc-400 font-normal cursor-pointer hover:text-white">Window</span>
        <span className="text-zinc-400 font-normal cursor-pointer hover:text-white">Help</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono leading-none">92%</span>
          <Battery className="w-3.5 h-3.5 text-zinc-300" />
        </div>
        <Wifi className="w-3.5 h-3.5 text-zinc-300" />
        <span className="text-[11px]">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
        </span>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { osStyle, colorMode } = useThemeStore();
  const themeContext = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove(
      "theme-win95-retro",
      "theme-win7-aero",
      "theme-macos",
      "theme-win11"
    );
    document.documentElement.classList.add(`theme-${osStyle}`);
    document.documentElement.setAttribute("data-os", osStyle);
    document.documentElement.setAttribute("data-theme", colorMode);
  }, [osStyle, colorMode]);

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

  // PREVENTS HYDRATION MISMATCH: Render a clean, dark splash screen during SSR
  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0c] flex items-center justify-center select-none">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

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
        data-os={osStyle}
        data-theme={colorMode}
        className={`h-screen w-screen relative overflow-hidden select-none theme-${osStyle} theme-${colorMode}`}
        style={{ background: "var(--wallpaper)" }}
      >
        {osStyle === "macos" && <MacTopBar />}

        {/* Keyboard OS Action interceptor */}
        <KeyboardManager setOpenPalette={setOpen} />

        {/* Desktop shortcuts / background icons & active windows */}
        <div className={osStyle === "macos" ? "pt-6 h-[calc(100vh-24px)]" : "h-full"}>
          <DesktopIcons />
          <Desktop />
        </div>

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