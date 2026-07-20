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
import { AppIcon } from "@/components/icons/AppIcon";

interface TaskbarContextMenuState {
  appId: string;
  x: number;
  y: number;
}

export function Taskbar() {
  const windows = useWindowStore((state) => state.windows);
  const windowWorkspaces = useWorkspaceStore((state) => state.windowWorkspaces);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const { osStyle, colorMode } = useThemeStore();
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
  if (osStyle === "win7-aero") {
    taskbarThemeClasses = "backdrop-blur-2xl bg-sky-950/50 border-t border-white/30 shadow-lg text-white";
  } else if (osStyle === "macos") {
    taskbarThemeClasses = colorMode === "light"
      ? "bg-slate-200/90 backdrop-blur-2xl border-t border-slate-300 text-slate-900 shadow-2xl"
      : "bg-[#1e1e1e]/90 backdrop-blur-2xl border-t border-[#323236] text-zinc-100 shadow-2xl";
  } else if (osStyle === "win11") {
    taskbarThemeClasses = colorMode === "light"
      ? "bg-white/80 backdrop-blur-xl border-t border-slate-200 text-slate-900 shadow-lg"
      : "bg-slate-900/70 backdrop-blur-xl border-t border-white/10 text-white shadow-lg";
  } else if (osStyle === "win95-retro") {
    taskbarThemeClasses = "bg-[#c0c0c0] text-black border-t-2 border-t-white border-l-2 border-l-white";
  }

  // 1. macOS Theme layout
  if (osStyle === "macos") {
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

        {showNotifications && (
          <div className="fixed bottom-18 right-4 w-80 max-h-96 z-50 bg-[#1e1e1e]/95 border border-[#323236] rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-lg animate-window-open text-xs">
            <div className="p-4 border-b border-[#323236] flex justify-between items-center bg-white/5">
              <span className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-blue-500" />
                Notification Center
              </span>
              <span className="text-[10px] text-zinc-400">{notifications.length} active</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 bg-zinc-900/80 border border-[#323236] rounded-xl hover:border-blue-500/30 transition">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-zinc-200">{n.title}</span>
                    <span className="text-[9px] text-zinc-500">{n.time}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="fixed bottom-3 left-1/2 -translate-x-1/2 h-16 px-4 rounded-2xl flex items-center gap-3.5 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-[#1e1e1e]/85 backdrop-blur-2xl border border-[#323236] text-zinc-100"
        >
          {taskbarAppIds.map((appId) => {
            const window = runningWindows.find(w => w.appId === appId);
            const isRunning = !!window;
            const workspace = window ? (windowWorkspaces[window.id] || 1) : 1;
            const isFocused = window?.isFocused && workspace === activeWorkspace;
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
                  rounded-[20%]
                  transition-all
                  duration-150
                  flex
                  items-center
                  justify-center
                  cursor-pointer
                  group
                  border-none
                  ${isFocused 
                    ? "bg-white/15 scale-95" 
                    : "hover:bg-white/10 hover:scale-105 active:scale-95 bg-transparent"
                  }
                `}
                title={appDef.title}
              >
                <AppIcon appId={appId} size={36} />
                {isRunning && (
                  <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // 2. Windows layouts (win11, win7-aero, win95-retro)
  const isRetro = osStyle === "win95-retro";
  const isAero = osStyle === "win7-aero";

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

      {showNotifications && (
        <div className={`fixed bottom-14 right-4 w-80 max-h-96 z-50 bg-[var(--surface)]/95 border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-lg animate-window-open text-xs ${isRetro ? "rounded-none border-2 border-t-white border-l-white border-b-black border-r-black bg-[#c0c0c0]" : ""}`}>
          <div className={`p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--border)]/20 ${isRetro ? "bg-[#000080] border-none text-white p-2" : ""}`}>
            <span className="font-semibold text-sm flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[var(--accent)]" />
              Notification Center
            </span>
            <span className="text-[10px] text-[var(--muted)]">{notifications.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 bg-[var(--background)]/80 border border-[var(--border)]/70 rounded-xl hover:border-[var(--accent)]/30 transition ${isRetro ? "rounded-none border-t-zinc-800 border-l-zinc-800 border-b-white border-r-white border-2 text-black bg-[#c0c0c0]" : ""}`}>
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

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-0 left-0 right-0 h-12 flex items-center px-4 justify-between z-50 transition-all duration-300 select-none ${
          isCollapsed ? "translate-y-[42px] opacity-25" : "translate-y-0 opacity-100"
        } ${isRetro ? "border-t-2 border-t-white border-l-2 border-l-white bg-[#c0c0c0] text-black font-sans text-sm shadow-none" : taskbarThemeClasses}`}
      >
        {/* WINDOWS 11 CENTERED LAYOUT */}
        {osStyle === "win11" && (
          <>
            {/* Left section: empty spacer */}
            <div className="w-1/4" />

            {/* Center section: Start button + App Icons */}
            <div className="flex items-center gap-2 justify-center flex-1">
              <button
                onClick={handleLauncherClick}
                className="p-2 rounded-xl hover:bg-white/10 hover:scale-105 transition text-blue-500 flex items-center justify-center cursor-pointer border-none bg-transparent"
                title="Start"
              >
                <Search className="w-4 h-4 text-sky-400" />
              </button>

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
                        ? "bg-white/10 shadow-inner scale-95" 
                        : "hover:bg-white/5 hover:scale-105 active:scale-95 bg-transparent"
                      }
                    `}
                    title={appDef.title}
                  >
                    <AppIcon appId={appId} size={28} />
                    {isRunning && (
                      <div
                        className={`
                          absolute
                          -bottom-0.5
                          h-0.5
                          rounded-full
                          transition-all
                          duration-150
                          ${isFocused ? "w-4 bg-blue-500" : isMinimized ? "w-1 bg-zinc-500" : "w-2 bg-blue-500/60"}
                        `}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* WINDOWS 7 AERO & WINDOWS 95 RETRO LEFT-ALIGNED LAYOUT */}
        {(isAero || isRetro) && (
          <div className="flex items-center gap-2 flex-1 justify-start">
            {/* Start Button */}
            {isRetro ? (
              <button
                onClick={handleLauncherClick}
                className="h-8 rounded-none bg-[#c0c0c0] text-black font-sans font-bold text-xs px-2 flex items-center gap-1.5 border-2 border-t-white border-l-white border-b-zinc-800 border-r-zinc-800 active:border-t-zinc-800 active:border-l-zinc-800 active:border-b-white active:border-r-white cursor-pointer select-none"
              >
                <div className="w-3.5 h-3.5 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex flex-wrap p-0.5 gap-0.5 animate-pulse">
                  <div className="w-1 h-1 bg-red-500" /><div className="w-1 h-1 bg-green-500" />
                  <div className="w-1 h-1 bg-blue-500" /><div className="w-1 h-1 bg-yellow-500" />
                </div>
                <span>Start</span>
              </button>
            ) : (
              <button
                onClick={handleLauncherClick}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 border border-blue-400/50 flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 cursor-pointer"
                title="Start"
              >
                <div className="w-4 h-4 rounded-full border-2 border-white/70" />
              </button>
            )}

            {/* Left-aligned App Icons / Tabs */}
            <div className="flex items-center gap-2 pl-2">
              {taskbarAppIds.map((appId) => {
                const window = runningWindows.find(w => w.appId === appId);
                const isRunning = !!window;
                const workspace = window ? (windowWorkspaces[window.id] || 1) : 1;
                const isFocused = window?.isFocused && workspace === activeWorkspace;
                const appDef = appRegistry.get(appId);

                if (!appDef) return null;

                if (isRetro) {
                  return (
                    <button
                      key={appId}
                      onClick={() => handleAppClick(appId)}
                      onContextMenu={(e) => handleRightClick(e, appId)}
                      className={`h-8 rounded-none text-black px-2.5 flex items-center gap-2 border-2 max-w-[120px] truncate cursor-pointer text-xs ${
                        isFocused 
                          ? "border-t-zinc-800 border-l-zinc-800 border-b-white border-r-white bg-[#e0e0e0] font-bold" 
                          : "border-t-white border-l-white border-b-zinc-800 border-r-zinc-800 bg-[#c0c0c0] font-normal"
                      }`}
                    >
                      <AppIcon appId={appId} size={16} />
                      <span className="truncate">{appDef.title}</span>
                    </button>
                  );
                }

                // win7 aero glossy tabs
                return (
                  <button
                    key={appId}
                    onClick={() => handleAppClick(appId)}
                    onContextMenu={(e) => handleRightClick(e, appId)}
                    className={`h-9 px-3 rounded-lg border flex items-center gap-2 text-xs text-white max-w-[130px] truncate transition-all cursor-pointer ${
                      isFocused 
                        ? "border-white/30 bg-white/20 shadow-inner font-semibold" 
                        : isRunning 
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-transparent bg-transparent hover:bg-white/5 opacity-70"
                    }`}
                  >
                    <AppIcon appId={appId} size={20} />
                    <span className="truncate">{appDef.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Section: System Tray & Clock */}
        <div className={`flex items-center justify-end gap-3.5 w-1/4 text-xs font-medium bg-transparent ${isRetro ? "w-auto shrink-0 justify-self-end animate-window-open" : ""}`}>
          
          {/* Tray Icons Box */}
          <div className={isRetro ? "flex items-center gap-2 px-2 py-0.5 border-2 border-t-zinc-800 border-l-zinc-800 border-b-white border-r-white bg-[#c0c0c0] font-sans text-xs select-none" : "flex items-center gap-3 px-1"}>
            {/* Auto-hide switcher (hidden in retro for high-fidelity tray) */}
            {!isRetro && (
              <button
                onClick={toggleAutohide}
                className="text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer border-none bg-transparent"
                title={isAutohide ? "Disable Taskbar Autohide" : "Enable Taskbar Autohide"}
              >
                {isAutohide ? <EyeOff className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Volume toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer border-none bg-transparent p-0 flex items-center justify-center"
              title={isMuted ? "Unmute sound" : "Mute sound"}
            >
              {isMuted 
                ? <VolumeX className={isRetro ? "w-3 h-3 text-black" : "w-3.5 h-3.5 text-rose-400"} /> 
                : <Volume2 className={isRetro ? "w-3 h-3 text-black" : "w-3.5 h-3.5 text-emerald-400"} />
              }
            </button>

            {/* Network Wifi Mock */}
            <div title="Connected to Network WAN" className="flex items-center justify-center">
              <Wifi className={isRetro ? "w-3 h-3 text-black" : "w-3.5 h-3.5 text-emerald-400"} />
            </div>

            {/* Battery status mock */}
            <div className="flex items-center gap-1 text-[var(--muted)]" title="Battery: 92% (Discharging)">
              <span className={`text-[10px] leading-none ${isRetro ? "text-black font-sans" : "font-mono text-[var(--muted)]"}`}>92%</span>
              <Battery className={isRetro ? "w-3 h-3 text-black" : "w-3.5 h-3.5 text-emerald-400"} />
            </div>

            {/* Notification Center bell trigger (hidden in retro) */}
            {!isRetro && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                }}
                className="text-[var(--muted)] hover:text-[var(--text)] transition relative cursor-pointer border-none bg-transparent"
                title="Toggle notifications"
              >
                <Bell className={`w-3.5 h-3.5 ${showNotifications ? "text-[var(--accent)]" : ""}`} />
                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              </button>
            )}

            {/* Retro Clock inside the recessed box */}
            {isRetro && (
              <>
                <div className="w-[1px] h-3 bg-zinc-800 mx-1" />
                <div className="font-bold text-black text-xs leading-none select-none">
                  {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                </div>
              </>
            )}
          </div>

          {/* Standard Clock (hidden in retro since rendered inside bevel box) */}
          {!isRetro && (
            <>
              {/* Divider */}
              <div className="w-[1px] h-4 bg-[var(--border)]/75" />

              {/* Clock/Date */}
              <div className="flex items-center gap-2 text-[var(--muted)] select-none">
                <div className="text-right">
                  <div className="font-semibold text-[var(--text)] text-[11px] leading-tight">
                    {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </div>
                  <div className="text-[9px] text-[var(--muted)] leading-tight mt-0.5">
                    {time.toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

