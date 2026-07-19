"use client";

import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";
import { useEffect, useState, createElement } from "react";
import { Grid, Volume2, VolumeX, Wifi, Battery, Eye, EyeOff } from "lucide-react";

export function Taskbar() {
  const manager = useWindowManager();
  const windows = manager.windows;
  const activeWorkspace = manager.activeWorkspace;
  const [time, setTime] = useState(new Date());

  // Taskbar settings states
  const [isMuted, setIsMuted] = useState(false);
  const [isAutohide, setIsAutohide] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const toggleAutohide = () => {
    const nextVal = !isAutohide;
    setIsAutohide(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("leviathan_taskbar_autohide", String(nextVal));
    }
  };

  const allApps = appRegistry.getAll();
  const runningAppIds = windows.map(w => w.id);

  const handleAppClick = (appId: string) => {
    const window = windows.find(w => w.id === appId);
    if (window) {
      if (window.workspace !== activeWorkspace) {
        // Switch workspace and focus
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

  const handleLauncherClick = () => {
    window.dispatchEvent(new CustomEvent("toggle-command-palette"));
  };

  const isCollapsed = isAutohide && !isHovered;

  return (
    <>
      {isAutohide && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          className="fixed bottom-0 left-0 right-0 h-2.5 z-40 bg-transparent"
        />
      )}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-0 left-0 right-0 h-12 bg-[var(--surface)]/70 border-t border-[var(--border)] backdrop-blur-lg flex items-center px-4 justify-between z-50 text-[var(--text)] transition-all duration-300 select-none ${
          isCollapsed ? "translate-y-[42px] opacity-25" : "translate-y-0 opacity-100"
        }`}
      >
      {/* Left Tray: Launcher & Workspaces */}
      <div className="flex items-center gap-3 w-1/4">
        {/* App Launcher Button */}
        <button
          onClick={handleLauncherClick}
          className="p-2 rounded-lg bg-[var(--border)]/40 hover:bg-[var(--border)]/80 text-violet-400 hover:scale-105 transition"
          title="Open Launcher (Super + D)"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Workspace indicators */}
        <div className="flex items-center bg-[var(--background)]/35 border border-[var(--border)] rounded-lg p-0.5 text-[10px] font-semibold">
          {([1, 2, 3, 4, 5, 6, 7, 8, 9]).map((num) => {
            const isActive = activeWorkspace === num;
            return (
              <button
                key={num}
                onClick={() => manager.setActiveWorkspace(num)}
                className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-[var(--muted)] hover:bg-[var(--border)]/40 hover:text-[var(--text)]"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Tray: Running & Pinned Apps */}
      <div className="flex items-center gap-1.5 justify-center flex-1">
        {allApps.map((app) => {
          const isRunning = runningAppIds.includes(app.id);
          const window = windows.find(w => w.id === app.id);
          const isFocused = window?.focused && window.workspace === activeWorkspace;
          const isMinimized = window?.minimized;

          return (
            <button
              key={app.id}
              onClick={() => handleAppClick(app.id)}
              className={`
                relative
                px-3
                py-2
                rounded-lg
                transition-all
                duration-150
                flex
                items-center
                gap-2
                text-xs
                font-medium
                ${isFocused ? "bg-[var(--border)] border border-violet-500/30 scale-95" : "hover:bg-[var(--border)]/40 hover:scale-105 active:scale-95"}
              `}
              title={`${app.title} ${isRunning ? `(Workspace ${window?.workspace})` : ""}`}
            >
              <span>{app.title}</span>
              
              {/* Running indicator */}
              {isRunning && (
                <div
                  className={`
                    absolute
                    bottom-1
                    left-1/2
                    -translate-x-1/2
                    w-1
                    h-1
                    rounded-full
                    ${isMinimized ? "bg-[var(--muted)]" : "bg-violet-500"}
                  `}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right Tray: System Tray Status & Clock */}
      <div className="flex items-center justify-end gap-4 w-1/4 text-xs">
        
        {/* Toggle Autohide Trigger */}
        <button
          onClick={toggleAutohide}
          className="text-[var(--muted)] hover:text-[var(--text)] transition"
          title={isAutohide ? "Disable Autohide" : "Enable Autohide"}
        >
          {isAutohide ? <EyeOff className="w-3.5 h-3.5 text-violet-400" /> : <Eye className="w-3.5 h-3.5" />}
        </button>

        {/* Volume status toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-[var(--muted)] hover:text-[var(--text)] transition"
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        {/* Network Wi-Fi status */}
        <div title="Connected to network">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* Battery Mock */}
        <div className="flex items-center gap-1 text-[var(--muted)]" title="Battery: 92% (Discharging)">
          <span className="text-[10px] font-mono">92%</span>
          <Battery className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* Divider */}
        <div className="w-[1px] h-4 bg-[var(--border)]" />

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
