"use client";

import React, { useState, useEffect } from "react";
import { useThemeStore } from "@/modules/theme/useThemeStore";
import { AppIcon } from "@/components/icons/AppIcon";
import { Wifi, Volume2, Battery, Apple } from "lucide-react";

export function Taskbar() {
  const { osStyle } = useThemeStore();
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

  // 1. macOS BIG SUR: Thin Top Menu Bar + Bottom Floating Dock
  if (osStyle === "macos") {
    return (
      <>
        {/* Top Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-slate-900/60 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between text-white text-xs z-50 select-none">
          <div className="flex items-center space-x-4 font-medium">
            <Apple className="w-3.5 h-3.5 fill-current"/>
            <span className="font-bold">Finder</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">File</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">Edit</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">View</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">Go</span>
            <span className="opacity-80 hover:opacity-100 cursor-pointer">Window</span>
          </div>
          <div className="flex items-center space-x-3 opacity-90">
            <Wifi className="w-3.5 h-3.5"/>
            <Volume2 className="w-3.5 h-3.5"/>
            <Battery className="w-3.5 h-3.5"/>
            <span>{dateStr}</span>
            <span className="font-semibold">{timeStr}</span>
          </div>
        </div>

        {/* Bottom Floating Dock */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/20 p-2 rounded-2xl shadow-2xl flex items-center space-x-3 pointer-events-auto">
            {apps.map((app) => (
              <button key={app} className="group relative focus:outline-none">
                <AppIcon appId={app} size={48} />
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-60" />
              </button>
            ))}
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
          <button className="h-8 px-3 bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black font-bold flex items-center space-x-1 active:border-t-black active:border-l-black active:border-b-white active:border-r-white">
            <span className="font-extrabold text-blue-800">田</span>
            <span>Start</span>
          </button>
          <div className="h-7 w-[2px] bg-zinc-400 mx-1 border-r border-white" />
          {apps.slice(0, 3).map((app) => (
            <button key={app} className="h-8 px-3 bg-[#c0c0c0] border-2 border-t-black border-l-black border-b-white border-r-white font-semibold flex items-center space-x-2 min-w-[120px] text-left">
              <AppIcon appId={app} size={20} />
              <span className="capitalize text-xs truncate">{app}</span>
            </button>
          ))}
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
          <button className="w-10 h-10 rounded-full bg-gradient-to-b from-sky-300 via-blue-600 to-blue-900 border-2 border-white/80 shadow-[0_0_15px_rgba(0,180,255,0.8)] flex items-center justify-center hover:brightness-125 transition-all">
            <span className="font-extrabold text-lg text-white drop-shadow">❖</span>
          </button>
          <div className="h-8 w-[1px] bg-white/20 mx-1" />
          {apps.map((app) => (
            <button key={app} className="p-1.5 rounded-lg hover:bg-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all border border-transparent hover:border-white/40">
              <AppIcon appId={app} size={32} />
            </button>
          ))}
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

  // 4. WINDOWS 11 MODERN (Default): Centered icons, clean right tray
  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-900/70 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 z-50 select-none text-white">
      <div className="w-32" /> {/* Left spacer for strict center balance */}
      <div className="flex items-center space-x-1.5">
        <button className="p-2 rounded-xl hover:bg-white/10 transition-all">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-md flex items-center justify-center shadow-md">
            <span className="text-white text-xs font-bold">❖</span>
          </div>
        </button>
        {apps.map((app) => (
          <button key={app} className="p-1.5 rounded-xl hover:bg-white/10 transition-all relative group">
            <AppIcon appId={app} size={32} />
            <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
      <div className="flex items-center space-x-3 px-3 py-1 rounded-xl hover:bg-white/5 transition-all cursor-pointer text-xs text-right">
        <Wifi className="w-4 h-4 opacity-80"/>
        <Volume2 className="w-4 h-4 opacity-80"/>
        <Battery className="w-4 h-4 opacity-80"/>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold">{timeStr}</span>
          <span className="opacity-70 text-[10px]">{dateStr}</span>
        </div>
      </div>
    </div>
  );
}
