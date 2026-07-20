"use client";

import { 
  useWindowStore, 
  useWorkspaceStore, 
  focusWindow, 
  minimizeWindow, 
  restoreWindow, 
  closeWindow, 
  openWindow 
} from "@/core/window/manager";
import { appRegistry } from "@/core/app";
import { useThemeStore } from "@/core/theme/useThemeStore";
import { useEffect, useState, useRef } from "react";
import { 
  Volume2, 
  VolumeX, 
  Wifi, 
  Battery, 
  Eye, 
  EyeOff, 
  Bell, 
  Search, 
  Pin, 
  PinOff,
  Grid
} from "lucide-react";
import { AppIcon } from "@/modules/icons/IconThemeContext";

interface TaskbarContextMenuState {
  appId: string;
  x: number;
  y: number;
}

export function Taskbar() {
  const windows = useWindowStore((state) => state.windows);
  const windowWorkspaces = useWorkspaceStore((state) => state.windowWorkspaces);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const activeTheme = useThemeStore((state) => state.theme);
  const [time, setTime] = useState(new Date());

  // Taskbar settings states
  const [isMuted, setIsMuted] = useState(false);
  const [isAutohide, setIsAutohide] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [contextMenu, setContextMenu] = useState<TaskbarContextMenuState | null>(null);

  // Notifications state mock
  const [notifications] = useState([
    { id: 1, title: "System Booted", body: "Iris Web OS kernel loaded successfully.", time: "Just now" },
    { id: 2, title: "Virtual File System", body: "VFS node mapping initialized.", time: "1m ago" },
    { id: 3, title: "Theme Manager", body: "Zero-dependency sound synthesizer compiled.", time: "3m ago" },
    { id: 4, title: "Virtual WAN Network", body: "Connected to virtual router gate 192.168.1.1.", time: "5m ago" }
  ]);

  // Pinned apps state
  const [pinnedApps, setPinnedApps] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("iris_pinned_apps");
      if (stored) return JSON.parse(stored);
    }
    return ["explorer", "terminal", "notes", "settings"];
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Load autohide setting
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("iris_taskbar_autohide");
      if (stored === "true") {
        setIsAutohide(true);
      }
    }
    
    return () => clearInterval(timer);
  }, []);

  // Global click listener to close context menus and popups
  useEffect(() => {
    const closeAll = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", closeAll);
    return () => window.removeEventListener("click", closeAll);
  }, []);

  const toggleAutohide = () => {
    const nextVal = !isAutohide;
    setIsAutohide(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("iris_taskbar_autohide", String(nextVal));
    }
  };

  const togglePin = (appId: string) => {
    const updated = pinnedApps.includes(appId)
      ? pinnedApps.filter(id => id !== appId)
      : [...pinnedApps, appId];
    setPinnedApps(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("iris_pinned_apps", JSON.stringify(updated));
    }
  };

  const handleAppClick = (appId: string) => {
    const window = Object.values(windows).find(w => w.appId === appId || w.id === appId);
    if (window) {
      const workspace = windowWorkspaces[window.id] || 1;
      if (workspace !== activeWorkspace) {
        useWorkspaceStore.getState().setActiveWorkspace(workspace);
        focusWindow(window.id);
      } else if (window.isMinimized) {
        restoreWindow(window.id);
      } else if (window.isFocused) {
        minimizeWindow(window.id);
      } else {
        focusWindow(window.id);
      }
    } else {
      openWindow(appId);
    }
  };

  const handleRightClick = (e: React.MouseEvent, appId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      appId,
      x: e.clientX,
      y: e.clientY - 80,
    });
  };

  const handleLauncherClick = () => {
    window.dispatchEvent(new CustomEvent("toggle-command-palette"));
  };

  const runningWindows = Object.values(windows);
  const runningAppIds = runningWindows.map(w => w.id);
  const runningNonPinned = runningWindows.filter(w => !pinnedApps.includes(w.appId));
  const uniqueRunningNonPinned = Array.from(new Set(runningNonPinned.map(w => w.appId)));
  const taskbarAppIds = [...pinnedApps, ...uniqueRunningNonPinned];

  const isCollapsed = isAutohide && !isHovered;

  let taskbarThemeClasses = "";
  if (activeTheme === "aero-glass") {
    taskbarThemeClasses = "bg-white/10 backdrop-blur-2xl border-t border-white/20 shadow-[0_-5px_15px_rgba(255,255,255,0.1)] text-white";
  } else if (activeTheme === "macos") {
    taskbarThemeClasses = "bg-[#1e1e1e]/90 backdrop-blur-2xl border-t border-[#323236] text-zinc-100 shadow-2xl";
  } else if (activeTheme === "clean-light") {
    taskbarThemeClasses = "bg-slate-100 border-t border-slate-300 text-slate-800 shadow-lg";
  } else {
    // default neon-dark (Pitch black, cyan border, cyber shadow)
    taskbarThemeClasses = "bg-[#0a0a0c] border-t border-cyan-500/50 backdrop-blur-md text-zinc-100 shadow-[0_-5px_15px_rgba(0,243,255,0.05)]";
  }

  return (
    <>
      {isAutohide && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          className="fixed bottom-0 left-0 right-0 h-2.5 z-40 bg-transparent"
        />
      )}

      {/* Taskbar Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-1.5 w-44 text-xs backdrop-blur-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              togglePin(contextMenu.appId);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--border)]/70 transition flex items-center gap-2"
          >
            {pinnedApps.includes(contextMenu.appId) ? (
              <>
                <PinOff className="w-3.5 h-3.5 text-rose-400" />
                Unpin from Dock
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-violet-400" />
                Pin to Dock
              </>
            )}
          </button>

          {runningWindows.some(w => w.appId === contextMenu.appId) && (
            <button
              onClick={() => {
                const win = runningWindows.find(w => w.appId === contextMenu.appId);
                if (win) {
                  closeWindow(win.id);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition flex items-center gap-2 mt-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Close Window
            </button>
          )}
        </div>
      )}

      {/* Notification Drawer Popup */}
      {showNotifications && (
        <div className="fixed bottom-14 right-4 w-80 max-h-96 z-50 bg-[var(--surface)]/95 border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-lg animate-window-open text-xs">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--border)]/20">
            <span className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-violet-400" />
              Notification Center
            </span>
            <span className="text-[10px] text-[var(--muted)]">{notifications.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 bg-[var(--background)]/80 border border-[var(--border)]/70 rounded-xl hover:border-violet-500/30 transition">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-zinc-200">{n.title}</span>
                  <span className="text-[9px] text-[var(--muted)]">{n.time}</span>
                </div>
                <p className="text-[10px] text-[var(--muted)] leading-normal">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Redesigned Taskbar / Dock */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-0 left-0 right-0 h-12 flex items-center px-4 justify-between z-50 transition-all duration-300 select-none ${
          isCollapsed ? "translate-y-[42px] opacity-25" : "translate-y-0 opacity-100"
        } ${taskbarThemeClasses}`}
      >
        {/* Left Section: Launcher & Workspace switcher */}
        <div className="flex items-center gap-3 w-1/4">
          <button
            onClick={handleLauncherClick}
            className="p-2 rounded-xl bg-[var(--border)]/35 hover:bg-[var(--border)]/75 hover:scale-105 transition text-[var(--accent)] flex items-center justify-center cursor-pointer border-none"
            title="Open Application Search (Alt + D)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Compact workspace switcher */}
          <div className="flex items-center bg-[var(--background)]/35 border border-[var(--border)]/55 rounded-xl p-0.5 font-mono text-[9px]">
            {([1, 2, 3, 4, 5]).map((num) => {
              const isActive = activeWorkspace === num;
              const hasWindows = runningWindows.some(w => windowWorkspaces[w.id] === num);
              return (
                <button
                  key={num}
                  onClick={() => useWorkspaceStore.getState().setActiveWorkspace(num)}
                  className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer border-none ${
                    isActive
                      ? "bg-[var(--accent)] text-white shadow-sm font-extrabold"
                      : hasWindows
                      ? "text-zinc-300 bg-[var(--border)]/50"
                      : "text-zinc-500 hover:bg-[var(--border)]/20 hover:text-[var(--text)]"
                  }`}
                  title={`Workspace ${num}`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Section: App Icons Dock */}
        <div className="flex items-center gap-2 justify-center flex-1">
          {taskbarAppIds.map((appId) => {
            const window = runningWindows.find(w => w.appId === appId);
            const isRunning = !!window;
            const workspace = window ? (windowWorkspaces[window.id] || 1) : 1;
            const isFocused = window?.isFocused && workspace === activeWorkspace;
            const isMinimized = window?.isMinimized;
            const appDef = appRegistry.get(appId);

            if (!appDef) return null;

            return (
              <button
                key={appId}
                onClick={() => handleAppClick(appId)}
                onContextMenu={(e) => handleRightClick(e, appId)}
                className={`
                  relative
                  p-1.5
                  rounded-xl
                  transition-all
                  duration-150
                  flex
                  items-center
                  justify-center
                  cursor-pointer
                  group
                  border-none
                  ${isFocused 
                    ? "bg-[var(--border)]/90 border border-[var(--accent)]/40 shadow-inner scale-95" 
                    : "hover:bg-[var(--border)]/50 hover:scale-105 active:scale-95"
                  }
                `}
                title={`${appDef.title} ${isRunning ? `(Workspace ${workspace})` : ""}`}
              >
                <AppIcon appId={appId} size={15} />
                
                {/* Horizontal Running bar indicator */}
                {isRunning && (
                  <div
                    className={`
                      absolute
                      -bottom-0.5
                      h-0.5
                      rounded-full
                      transition-all
                      duration-150
                      ${isFocused 
                        ? "w-4 bg-[var(--accent)]" 
                        : isMinimized 
                        ? "w-1 bg-zinc-500" 
                        : "w-2 bg-[var(--accent)]/60"
                      }
                    `}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Section: System Tray & Clock */}
        <div className="flex items-center justify-end gap-3.5 w-1/4 text-xs font-medium">
          
          <div className="flex items-center bg-[var(--background)]/40 border border-[var(--border)]/65 rounded-xl px-2 py-1 gap-3">
            {/* Auto-hide switcher */}
            <button
              onClick={toggleAutohide}
              className="text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer border-none"
              title={isAutohide ? "Disable Taskbar Autohide" : "Enable Taskbar Autohide"}
            >
              {isAutohide ? <EyeOff className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Volume toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer border-none"
              title={isMuted ? "Unmute sound" : "Mute sound"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Network Wifi Mock */}
            <div title="Connected to Network WAN">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {/* Battery status mock */}
            <div className="flex items-center gap-1 text-[var(--muted)]" title="Battery: 92% (Discharging)">
              <span className="text-[10px] font-mono leading-none">92%</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {/* Notification Center bell trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
              }}
              className="text-[var(--muted)] hover:text-[var(--text)] transition relative cursor-pointer border-none"
              title="Toggle notifications"
            >
              <Bell className={`w-3.5 h-3.5 ${showNotifications ? "text-[var(--accent)]" : ""}`} />
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-[var(--border)]/75" />

          {/* Clock/Date */}
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <div className="text-right">
              <div className="font-semibold text-[var(--text)] text-[11px] leading-tight">
                {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-[9px] text-[var(--muted)] leading-tight mt-0.5">
                {time.toLocaleDateString([], { month: "short", day: "numeric" })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
