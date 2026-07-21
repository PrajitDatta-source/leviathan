"use client";

import React, { useState, useEffect } from "react";
import { useThemeStore } from "@/modules/theme/useThemeStore";
import { AppIcon } from "@/components/icons/AppIcon";
import { Wifi, Volume2, Battery, Apple } from "lucide-react";
import SyncDot from "@/components/os/SyncDot";
import { 
  useWindowStore, 
  useWorkspaceStore, 
  focusWindow, 
  minimizeWindow, 
  restoreWindow, 
  openWindow 
} from "@/core/window/manager";

export function Taskbar() {
  const { osStyle } = useThemeStore();
  const windows = useWindowStore((state) => state.windows);
  const windowWorkspaces = useWorkspaceStore((state) => state.windowWorkspaces);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const apps = ["explorer", "terminal", "notes", "settings", "telegram", "trash"];

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

  const handleLauncherClick = () => {
    window.dispatchEvent(new CustomEvent("toggle-command-palette"));
  };

  // 1. macOS BIG SUR: Thin Top Menu Bar + Bottom Floating Dock
  if (osStyle === "macos") {
    return (
      <>
        {/* Top Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-slate-900/60 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between text-white text-xs z-50 select-none">
          <div className="flex items-center space-x-4 font-medium">
            <Apple className="w-3.5 h-3.5 fill-current cursor-pointer" onClick={handleLauncherClick}/>
            <span className="font-bold cursor-pointer" onClick={handleLauncherClick}>Finder</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">File</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">Edit</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">View</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">Go</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">Window</span>
          </div>
          <div className="flex items-center space-x-3 opacity-90">
            <Wifi className="w-3.5 h-3.5 cursor-pointer"/>
            <Volume2 className="w-3.5 h-3.5 cursor-pointer"/>
            <Battery className="w-3.5 h-3.5 cursor-pointer"/>
            <span>{dateStr}</span>
            <span className="font-semibold">{timeStr}</span>
          </div>
        </div>

        {/* Bottom Floating Dock */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/20 p-2 rounded-2xl shadow-2xl flex items-center space-x-3 pointer-events-auto">
            {apps.map((app) => {
              const isRunning = Object.values(windows).some(w => w.appId === app);
              return (
                <button
                  key={app}
                  onClick={() => handleAppClick(app)}
                  className="group relative focus:outline-none cursor-pointer"
                  title={app}
                >
                  <AppIcon appId={app} size={48} />
                  {isRunning && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-90" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // 2. WINDOWS 95 RETRO: Solid grey bottom bar with 3D raised start button
  if (osStyle === "win95-retro") {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#c0c0c0] border-t-2 border-white flex items-center justify-between px-1 z-50 select-none text-black font-sans text-sm">
        <div className="flex items-center space-x-1">
          <button
            onClick={handleLauncherClick}
            className="h-8 px-3 bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black font-bold flex items-center space-x-1 active:border-t-black active:border-l-black active:border-b-white active:border-r-white cursor-pointer"
          >
            <span className="font-extrabold text-blue-800">田</span>
            <span>Start</span>
          </button>
          <div className="h-7 w-[2px] bg-zinc-400 mx-1 border-r border-white" />
          {apps.slice(0, 4).map((app) => {
            const window = Object.values(windows).find(w => w.appId === app);
            const isFocused = window?.isFocused;
            return (
              <button
                key={app}
                onClick={() => handleAppClick(app)}
                className={`h-8 px-3 bg-[#c0c0c0] border-2 font-semibold flex items-center space-x-2 min-w-[110px] text-left cursor-pointer ${
                  isFocused
                    ? "border-t-black border-l-black border-b-white border-r-white bg-[#e0e0e0] font-bold"
                    : "border-t-white border-l-white border-b-black border-r-black"
                }`}
              >
                <AppIcon appId={app} size={20} />
                <span className="capitalize text-xs truncate">{app}</span>
              </button>
            );
          })}
        </div>
        <div className="h-8 px-3 bg-[#c0c0c0] border-2 border-t-black border-l-black border-b-white border-r-white flex items-center space-x-2 text-xs font-semibold">
          <Volume2 className="w-3.5 h-3.5 text-zinc-700"/>
          <span>{timeStr}</span>
        </div>
      </div>
    );
  }

  // 3. WINDOWS 7 AERO GLASS: Left-aligned glossy translucent bar
  if (osStyle === "win7-aero") {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-sky-950/50 backdrop-blur-2xl border-t border-white/30 shadow-[0_-2px_15px_rgba(0,0,0,0.5)] flex items-center justify-between px-2 z-50 select-none text-white">
        <div className="flex items-center space-x-2">
          {/* Glowing Windows 7 Orb */}
          <button
            onClick={handleLauncherClick}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-sky-300 via-blue-600 to-blue-900 border-2 border-white/80 shadow-[0_0_15px_rgba(0,180,255,0.8)] flex items-center justify-center hover:brightness-125 transition-all cursor-pointer"
            title="Start"
          >
            <span className="font-extrabold text-lg text-white drop-shadow">❖</span>
          </button>
          <div className="h-8 w-[1px] bg-white/20 mx-1" />
          {apps.map((app) => {
            const isRunning = Object.values(windows).some(w => w.appId === app);
            return (
              <button
                key={app}
                onClick={() => handleAppClick(app)}
                className={`p-1.5 rounded-lg hover:bg-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all border cursor-pointer ${
                  isRunning ? "bg-white/15 border-white/40 shadow-inner" : "border-transparent"
                }`}
                title={app}
              >
                <AppIcon appId={app} size={32} />
              </button>
            );
          })}
        </div>
        <div className="flex items-center space-x-3 px-3 py-1 bg-black/20 rounded border border-white/10 text-xs text-right">
          <Wifi className="w-4 h-4"/>
          <Volume2 className="w-4 h-4"/>
          <div className="flex flex-col leading-tight font-medium">
            <span>{timeStr}</span>
            <span className="opacity-75 text-[10px]">{dateStr}</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. IRIS GLASS: Refined frosted-glass floating dock, ported from the
  // glass-pane aesthetic (specular sheen, rim highlight, frosted backdrop).
  if (osStyle === "iris-glass") {
    return (
      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-50 pointer-events-none select-none">
        <div className="glass-pane pointer-events-auto flex items-center gap-1.5 rounded-2xl px-2.5 py-2">
          <button
            onClick={handleLauncherClick}
            className="relative p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            title="Start"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-[0_0_12px_-2px_rgba(167,139,250,0.8)] flex items-center justify-center">
              <span className="text-white text-xs font-bold">✦</span>
            </div>
          </button>
          <div className="h-7 w-px bg-white/10 mx-1" />
          {apps.map((app) => {
            const window = Object.values(windows).find(w => w.appId === app);
            const isRunning = !!window;
            const isFocused = window?.isFocused;
            return (
              <button
                key={app}
                onClick={() => handleAppClick(app)}
                className={`relative p-1.5 rounded-xl transition-all group cursor-pointer hover:bg-white/10 ${
                  isFocused ? "bg-white/10" : ""
                }`}
                title={app}
              >
                <AppIcon appId={app} size={32} />
                <div
                  className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 rounded-full bg-violet-300 transition-all ${
                    isFocused ? "w-4 opacity-100" : isRunning ? "w-1.5 opacity-70" : "w-0 opacity-0 group-hover:opacity-100 group-hover:w-1.5"
                  }`}
                />
              </button>
            );
          })}
          <div className="h-7 w-px bg-white/10 mx-1" />
          <div
            onClick={handleLauncherClick}
            className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl hover:bg-white/10 transition-all cursor-pointer text-xs"
          >
            <Wifi className="w-4 h-4 opacity-80" />
            <Volume2 className="w-4 h-4 opacity-80" />
            <span className="glass-clock font-semibold text-sm leading-none">{timeStr}</span>
          </div>
        </div>
      </div>
    );
  }

  // 5. WINDOWS 11 MODERN (Default): Centered icons, clean right tray
  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-900/70 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 z-50 select-none text-white">
      <div className="w-32" /> {/* Left spacer for strict center balance */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={handleLauncherClick}
          className="p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          title="Start"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-md flex items-center justify-center shadow-md">
            <span className="text-white text-xs font-bold">❖</span>
          </div>
        </button>
        {apps.map((app) => {
          const window = Object.values(windows).find(w => w.appId === app);
          const isRunning = !!window;
          const isFocused = window?.isFocused;
          return (
            <button
              key={app}
              onClick={() => handleAppClick(app)}
              className={`p-1.5 rounded-xl hover:bg-white/10 transition-all relative group cursor-pointer ${
                isFocused ? "bg-white/15" : ""
              }`}
              title={app}
            >
              <AppIcon appId={app} size={32} />
              <div
                className={`absolute bottom-0.5 left-1/2 transform -translate-x-1/2 h-1 bg-cyan-400 rounded-full transition-all ${
                  isFocused ? "w-4 opacity-100" : isRunning ? "w-1.5 opacity-70" : "w-0 opacity-0 group-hover:opacity-100 group-hover:w-1.5"
                }`}
              />
            </button>
          );
        })}
      </div>
      <div className="flex items-center space-x-3">
        <SyncDot />
        <div
          onClick={handleLauncherClick}
          className="flex items-center space-x-3 px-3 py-1 rounded-xl hover:bg-white/5 transition-all cursor-pointer text-xs text-right"
        >
          <Wifi className="w-4 h-4 opacity-80"/>
          <Volume2 className="w-4 h-4 opacity-80"/>
          <Battery className="w-4 h-4 opacity-80"/>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{timeStr}</span>
            <span className="opacity-70 text-[10px]">{dateStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
