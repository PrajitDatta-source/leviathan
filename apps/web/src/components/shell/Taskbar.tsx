"use client";

import React, { useState, useEffect, useRef } from "react";
import { useThemeStore } from "@/modules/theme/useThemeStore";
import { AppIcon } from "@/components/icons/AppIcon";
import { Wifi, Volume2, VolumeX, Search } from "lucide-react";
import SyncDot from "@/components/os/SyncDot";
import {
  useWindowStore,
  useWorkspaceStore,
  focusWindow,
  minimizeWindow,
  restoreWindow,
  openWindow
} from "@/core/window/manager";

// Tiny month calendar, driven by the real current date — used by the
// clock's popover. No external dependency needed for something this small.
function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString([], { month: "long", year: "numeric" });
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="w-56">
      <div className="text-xs font-semibold mb-2 text-center">{monthName}</div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-center opacity-60 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-center">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`h-6 flex items-center justify-center rounded-md ${
              day === now.getDate() ? "bg-[var(--accent)] text-white font-semibold" : day ? "opacity-80" : ""
            }`}
          >
            {day || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared quick-settings popover shell — click-outside and Escape both close it.
function TrayPopover({ anchor, onClose, children }: { anchor: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-14 z-[60] rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-2xl shadow-2xl p-4 text-[var(--text)]"
      style={{ [anchor]: "0.75rem" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function Taskbar() {
  const { osStyle, glass } = useThemeStore();
  const windows = useWindowStore((state) => state.windows);
  const windowWorkspaces = useWorkspaceStore((state) => state.windowWorkspaces);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [openPopover, setOpenPopover] = useState<"clock" | "wifi" | "volume" | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(70);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: "short", month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("iris_muted");
    if (saved) setMuted(saved === "true");
    const savedVol = localStorage.getItem("iris_volume");
    if (savedVol) setVolume(Number(savedVol));
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("iris_muted", String(next));
    window.dispatchEvent(new CustomEvent("iris-volume-change", { detail: { muted: next, volume } }));
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    localStorage.setItem("iris_volume", String(v));
    window.dispatchEvent(new CustomEvent("iris-volume-change", { detail: { muted, volume: v } }));
  };

  const apps = ["explorer", "terminal", "notes", "gmail", "telegram", "dashboard", "weather", "settings", "trash"];

  const handleAppClick = (appId: string) => {
    const win = Object.values(windows).find(w => w.appId === appId || w.id === appId);
    if (win) {
      const workspace = windowWorkspaces[win.id] || 1;
      if (workspace !== activeWorkspace) {
        useWorkspaceStore.getState().setActiveWorkspace(workspace);
        focusWindow(win.id);
      } else if (win.isMinimized) {
        restoreWindow(win.id);
      } else if (win.isFocused) {
        minimizeWindow(win.id);
      } else {
        focusWindow(win.id);
      }
    } else {
      openWindow(appId);
    }
  };

  const handleLauncherClick = () => {
    window.dispatchEvent(new CustomEvent("toggle-command-palette"));
  };

  const togglePopover = (which: "clock" | "wifi" | "volume") => {
    setOpenPopover((prev) => (prev === which ? null : which));
  };

  // WINDOWS 7 AERO: left-aligned glossy translucent bar, orb start button.
  if (osStyle === "win7-aero") {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 h-12 backdrop-blur-2xl border-t flex items-center justify-between px-2 z-50 select-none"
        style={{
          background: "linear-gradient(180deg, rgba(9,20,35,0.55) 0%, rgba(9,20,35,0.75) 100%)",
          borderColor: "var(--border)",
          color: "var(--text)",
          boxShadow: "0 -2px 15px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLauncherClick}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-sky-300 via-blue-600 to-blue-900 border-2 border-white/80 shadow-[0_0_15px_rgba(0,180,255,0.8)] flex items-center justify-center hover:brightness-125 transition-all cursor-pointer"
            title="Start"
          >
            <span className="font-extrabold text-lg text-white drop-shadow">❖</span>
          </button>
          <button
            onClick={handleLauncherClick}
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-2 text-xs transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="opacity-80">Search</span>
          </button>
          <div className="h-8 w-[1px] bg-white/20 mx-1" />
          {apps.map((app) => {
            const isRunning = Object.values(windows).some(w => w.appId === app);
            const isFocused = Object.values(windows).some(w => w.appId === app && w.isFocused);
            return (
              <button
                key={app}
                onClick={() => handleAppClick(app)}
                className={`p-1.5 rounded-lg hover:bg-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all border cursor-pointer ${
                  isFocused ? "bg-white/20 border-white/50 shadow-inner" : isRunning ? "bg-white/10 border-white/25" : "border-transparent"
                }`}
                title={app}
              >
                <AppIcon appId={app} size={30} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => togglePopover("wifi")}
            className="p-2 rounded hover:bg-white/10 cursor-pointer"
            title="Network"
          >
            <Wifi className="w-4 h-4" />
          </button>
          <button
            onClick={() => togglePopover("volume")}
            className="p-2 rounded hover:bg-white/10 cursor-pointer"
            title="Volume"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => togglePopover("clock")}
            className="flex flex-col leading-tight font-medium text-right px-3 py-1 rounded hover:bg-white/10 cursor-pointer text-xs"
          >
            <span>{timeStr}</span>
            <span className="opacity-75 text-[10px]">{dateStr}</span>
          </button>

          {openPopover === "wifi" && (
            <TrayPopover anchor="right" onClose={() => setOpenPopover(null)}>
              <div className="text-xs font-semibold mb-1">Network</div>
              <div className="flex items-center gap-2 text-xs opacity-80">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Connected
              </div>
            </TrayPopover>
          )}
          {openPopover === "volume" && (
            <TrayPopover anchor="right" onClose={() => setOpenPopover(null)}>
              <div className="flex items-center gap-3 w-44">
                <button onClick={toggleMute} className="cursor-pointer">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1 accent-[var(--accent)] cursor-pointer"
                />
              </div>
            </TrayPopover>
          )}
          {openPopover === "clock" && (
            <TrayPopover anchor="right" onClose={() => setOpenPopover(null)}>
              <MiniCalendar />
            </TrayPopover>
          )}
        </div>
      </div>
    );
  }

  // WINDOWS 11 MODERN (default) — used by Windows 11, Light, Dark, Glass.
  // The only visual difference between those four is CSS vars + whether
  // `glass` adds extra blur; the layout and every interaction below is
  // identical and fully theme-aware (no hardcoded slate colors).
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-14 border-t flex items-center justify-between px-3 z-50 select-none ${glass ? "glass-pane" : ""}`}
      style={
        glass
          ? { color: "var(--text)" }
          : { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)", backdropFilter: "blur(20px)" }
      }
    >
      <div className="w-40 flex items-center">
        <SyncDot />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleLauncherClick}
          className="p-2 rounded-xl hover:bg-[var(--muted)] transition-all cursor-pointer"
          title="Start"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/70 rounded-md flex items-center justify-center shadow-md">
            <span className="text-white text-xs font-bold">❖</span>
          </div>
        </button>

        <button
          onClick={handleLauncherClick}
          className="h-9 px-3 rounded-xl hover:bg-[var(--muted)] border border-[var(--border)] flex items-center gap-2 text-xs transition-all cursor-pointer opacity-80 hover:opacity-100"
          title="Search (or press Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
        </button>

        <div className="h-7 w-px bg-[var(--border)] mx-1" />

        {apps.map((app) => {
          const win = Object.values(windows).find(w => w.appId === app);
          const isRunning = !!win;
          const isFocused = win?.isFocused;
          return (
            <button
              key={app}
              onClick={() => handleAppClick(app)}
              className={`p-1.5 rounded-xl hover:bg-[var(--muted)] transition-all relative group cursor-pointer ${
                isFocused ? "bg-[var(--muted)]" : ""
              }`}
              title={app}
            >
              <AppIcon appId={app} size={30} />
              <div
                className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 rounded-full bg-[var(--accent)] transition-all ${
                  isFocused ? "w-4 opacity-100" : isRunning ? "w-1.5 opacity-70" : "w-0 opacity-0 group-hover:opacity-100 group-hover:w-1.5"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="w-40 flex items-center justify-end gap-1 relative">
        <button
          onClick={() => togglePopover("wifi")}
          className="p-2 rounded-lg hover:bg-[var(--muted)] cursor-pointer"
          title="Network"
        >
          <Wifi className="w-4 h-4 opacity-80" />
        </button>
        <button
          onClick={() => togglePopover("volume")}
          className="p-2 rounded-lg hover:bg-[var(--muted)] cursor-pointer"
          title="Volume"
        >
          {muted ? <VolumeX className="w-4 h-4 opacity-80" /> : <Volume2 className="w-4 h-4 opacity-80" />}
        </button>
        <button
          onClick={() => togglePopover("clock")}
          className="flex flex-col leading-tight px-2.5 py-1 rounded-lg hover:bg-[var(--muted)] cursor-pointer text-right"
        >
          <span className="font-semibold text-xs">{timeStr}</span>
          <span className="opacity-70 text-[10px]">{dateStr}</span>
        </button>

        {openPopover === "wifi" && (
          <TrayPopover anchor="right" onClose={() => setOpenPopover(null)}>
            <div className="text-xs font-semibold mb-1">Network</div>
            <div className="flex items-center gap-2 text-xs opacity-80">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Connected
            </div>
          </TrayPopover>
        )}
        {openPopover === "volume" && (
          <TrayPopover anchor="right" onClose={() => setOpenPopover(null)}>
            <div className="flex items-center gap-3 w-44">
              <button onClick={toggleMute} className="cursor-pointer">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)] cursor-pointer"
              />
            </div>
          </TrayPopover>
        )}
        {openPopover === "clock" && (
          <TrayPopover anchor="right" onClose={() => setOpenPopover(null)}>
            <MiniCalendar />
          </TrayPopover>
        )}
      </div>
    </div>
  );
}
