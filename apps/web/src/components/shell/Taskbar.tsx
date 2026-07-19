"use client";

import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";
import { useEffect, useState, createElement, useRef } from "react";
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
  SquareTerminal,
  Grid
} from "lucide-react";
import { AppIcon } from "@/modules/icons/IconThemeContext";

interface TaskbarContextMenuState {
  appId: string;
  x: number;
  y: number;
}

export function Taskbar() {
  const manager = useWindowManager();
  const windows = manager.windows;
  const activeWorkspace = manager.activeWorkspace;
  const [time, setTime] = useState(new Date());

  // Taskbar settings states
  const [isMuted, setIsMuted] = useState(false);
  const [isAutohide, setIsAutohide] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [contextMenu, setContextMenu] = useState<TaskbarContextMenuState | null>(null);

  // Notifications state mock
  const [notifications] = useState([
    { id: 1, title: "System Booted", body: "Leviathan Web OS kernel loaded successfully.", time: "Just now" },
    { id: 2, title: "Virtual File System", body: "VFS node mapping initialized.", time: "1m ago" },
    { id: 3, title: "Theme Manager", body: "Zero-dependency sound synthesizer compiled.", time: "3m ago" },
    { id: 4, title: "Virtual WAN Network", body: "Connected to virtual router gate 192.168.1.1.", time: "5m ago" }
  ]);

  // Pinned apps state
  const [pinnedApps, setPinnedApps] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leviathan_pinned_apps");
      if (stored) return JSON.parse(stored);
    }
    return ["explorer", "terminal", "notes", "settings"];
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Load autohide setting
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leviathan_taskbar_autohide");
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
      localStorage.setItem("leviathan_taskbar_autohide", String(nextVal));
    }
  };

  const togglePin = (appId: string) => {
    const updated = pinnedApps.includes(appId)
      ? pinnedApps.filter(id => id !== appId)
      : [...pinnedApps, appId];
    setPinnedApps(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("leviathan_pinned_apps", JSON.stringify(updated));
    }
  };

  const handleAppClick = (appId: string) => {
    const window = windows.find(w => w.id === appId);
    if (window) {
      if (window.workspace !== activeWorkspace) {
        manager.setActiveWorkspace(window.workspace);
        manager.focus(appId);
      } else if (window.minimized) {
        manager.restore(appId);
      } else if (window.focused) {
        manager.minimize(appId);
      } else {
        manager.focus(appId);
      }
    } else {
      const app = appRegistry.get(appId);
      if (app) {
        manager.open({
          id: appId,
          title: app.title,
          content: createElement(app.component),
          width: app.width || 700,
          height: app.height || 500,
        });
      }
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

  const runningAppIds = windows.map(w => w.id);
  const runningNonPinned = runningAppIds.filter(id => !pinnedApps.includes(id));
  // Combine pinned apps with running apps that aren't pinned
  const taskbarAppIds = [...pinnedApps, ...runningNonPinned];

  const isCollapsed = isAutohide && !isHovered;

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

          {runningAppIds.includes(contextMenu.appId) && (
            <button
              onClick={() => {
                manager.close(contextMenu.appId);
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
        className={`fixed bottom-0 left-0 right-0 h-12 bg-[var(--surface)]/75 border-t border-[var(--border)] backdrop-blur-xl flex items-center px-4 justify-between z-50 text-[var(--text)] transition-all duration-300 select-none ${
          isCollapsed ? "translate-y-[42px] opacity-25" : "translate-y-0 opacity-100"
        }`}
      >
        {/* Left Section: Launcher & Workspace switcher */}
        <div className="flex items-center gap-3 w-1/4">
          <button
            onClick={handleLauncherClick}
            className="p-2 rounded-xl bg-[var(--border)]/35 hover:bg-[var(--border)]/75 hover:scale-105 transition text-violet-400 flex items-center justify-center cursor-pointer"
            title="Open Application Search (Alt + D)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Compact workspace switcher */}
          <div className="flex items-center bg-[var(--background)]/35 border border-[var(--border)]/55 rounded-xl p-0.5 font-mono text-[9px]">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9]).map((num) => {
              const isActive = activeWorkspace === num;
              const hasWindows = windows.some(w => w.workspace === num);
              return (
                <button
                  key={num}
                  onClick={() => manager.setActiveWorkspace(num)}
                  className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-violet-600 text-white shadow-sm"
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
            const isRunning = runningAppIds.includes(appId);
            const window = windows.find(w => w.id === appId);
            const isFocused = window?.focused && window.workspace === activeWorkspace;
            const isMinimized = window?.minimized;
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
                  ${isFocused 
                    ? "bg-[var(--border)]/90 border border-violet-500/40 shadow-inner scale-95" 
                    : "hover:bg-[var(--border)]/50 hover:scale-105 active:scale-95"
                  }
                `}
                title={`${appDef.title} ${isRunning ? `(Workspace ${window?.workspace})` : ""}`}
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
                        ? "w-4 bg-violet-400" 
                        : isMinimized 
                        ? "w-1 bg-zinc-500" 
                        : "w-2 bg-violet-500/60"
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
          
          <div className="flex items-center bg-zinc-900/40 border border-[var(--border)]/65 rounded-xl px-2 py-1 gap-3">
            {/* Auto-hide switcher */}
            <button
              onClick={toggleAutohide}
              className="text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
              title={isAutohide ? "Disable Taskbar Autohide" : "Enable Taskbar Autohide"}
            >
              {isAutohide ? <EyeOff className="w-3.5 h-3.5 text-violet-400" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Volume toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
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
              className="text-[var(--muted)] hover:text-[var(--text)] transition relative cursor-pointer"
              title="Toggle notifications"
            >
              <Bell className={`w-3.5 h-3.5 ${showNotifications ? "text-violet-400" : ""}`} />
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />
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
