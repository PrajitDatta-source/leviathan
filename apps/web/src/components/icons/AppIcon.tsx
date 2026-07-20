"use client";

import React from "react";
import { useThemeStore } from "@/modules/theme/useThemeStore";
import { Folder, Terminal, FileText, Settings, Trash2, Mail, MessageSquare } from "lucide-react";

interface AppIconProps {
  appId: string;
  size?: number;
  className?: string;
}

export function AppIcon({ appId, size = 48, className = "" }: AppIconProps) {
  const { osStyle } = useThemeStore();

  if (osStyle === "macos") {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative rounded-[22%] shadow-lg flex items-center justify-center overflow-hidden transition-all duration-150 group-hover:scale-105 group-hover:shadow-xl ${className}`}
      >
        {appId === "explorer" && <div className="w-full h-full bg-gradient-to-b from-blue-400 to-blue-600 flex items-center justify-center border border-white/20"><Folder className="w-1/2 h-1/2 text-white fill-white/20 drop-shadow-sm"/></div>}
        {appId === "terminal" && <div className="w-full h-full bg-gradient-to-b from-zinc-700 to-zinc-950 flex items-center justify-center border border-white/10"><span className="font-mono font-bold text-emerald-400 text-xs tracking-tighter">&gt;_</span></div>}
        {appId === "notes" && <div className="w-full h-full bg-gradient-to-b from-amber-400 to-amber-500 flex items-center justify-center border border-white/20"><FileText className="w-1/2 h-1/2 text-white drop-shadow-sm"/></div>}
        {appId === "settings" && <div className="w-full h-full bg-gradient-to-b from-slate-500 to-slate-700 flex items-center justify-center border border-white/20"><Settings className="w-1/2 h-1/2 text-white animate-spin-slow"/></div>}
        {appId === "trash" && <div className="w-full h-full bg-gradient-to-b from-rose-500 to-rose-700 flex items-center justify-center border border-white/20"><Trash2 className="w-1/2 h-1/2 text-white drop-shadow-sm"/></div>}
        {appId === "gmail" && <div className="w-full h-full bg-gradient-to-b from-red-500 to-red-600 flex items-center justify-center border border-white/20"><Mail className="w-1/2 h-1/2 text-white drop-shadow-sm"/></div>}
        {appId === "telegram" && <div className="w-full h-full bg-gradient-to-b from-sky-400 to-blue-500 flex items-center justify-center border border-white/20"><MessageSquare className="w-1/2 h-1/2 text-white fill-white/20 drop-shadow-sm"/></div>}
      </div>
    );
  }

  if (osStyle === "win7-aero") {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:brightness-110 group-hover:-translate-y-0.5 ${className}`}
      >
        <div className="absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b from-white/70 to-white/10 rounded-t-xl pointer-events-none z-10" />
        {appId === "explorer" && <div className="w-full h-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center border border-white/60 shadow-inner"><Folder className="w-3/5 h-3/5 text-amber-950 fill-amber-100/60 drop-shadow"/></div>}
        {appId === "terminal" && <div className="w-full h-full bg-gradient-to-b from-slate-800 via-slate-900 to-black flex items-center justify-center border border-white/40 shadow-inner"><Terminal className="w-3/5 h-3/5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]"/></div>}
        {appId === "notes" && <div className="w-full h-full bg-gradient-to-b from-sky-300 via-sky-400 to-blue-600 flex items-center justify-center border border-white/60 shadow-inner"><FileText className="w-3/5 h-3/5 text-white drop-shadow"/></div>}
        {appId === "settings" && <div className="w-full h-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 flex items-center justify-center border border-white/60 shadow-inner"><Settings className="w-3/5 h-3/5 text-zinc-900 drop-shadow-sm"/></div>}
        {appId === "trash" && <div className="w-full h-full bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 flex items-center justify-center border border-white/60 shadow-inner"><Trash2 className="w-3/5 h-3/5 text-rose-600 drop-shadow"/></div>}
        {appId === "gmail" && <div className="w-full h-full bg-gradient-to-b from-rose-400 via-red-500 to-red-700 flex items-center justify-center border border-white/60 shadow-inner"><Mail className="w-3/5 h-3/5 text-white drop-shadow"/></div>}
        {appId === "telegram" && <div className="w-full h-full bg-gradient-to-b from-sky-300 via-blue-400 to-blue-600 flex items-center justify-center border border-white/60 shadow-inner"><MessageSquare className="w-3/5 h-3/5 text-white fill-white/20 drop-shadow"/></div>}
      </div>
    );
  }

  if (osStyle === "win95-retro") {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative rounded-none bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black flex items-center justify-center transition-none group-active:border-t-black group-active:border-l-black group-active:border-b-white group-active:border-r-white ${className}`}
      >
        {appId === "explorer" && <Folder className="w-3/5 h-3/5 text-yellow-500 fill-yellow-300 stroke-[2]"/>}
        {appId === "terminal" && <div className="w-4/5 h-4/5 bg-black border border-zinc-600 flex items-center justify-center"><span className="font-mono font-bold text-white text-xs">&gt;_</span></div>}
        {appId === "notes" && <FileText className="w-3/5 h-3/5 text-blue-800 fill-white stroke-[2]"/>}
        {appId === "settings" && <Settings className="w-3/5 h-3/5 text-zinc-700 stroke-[2]"/>}
        {appId === "trash" && <Trash2 className="w-3/5 h-3/5 text-zinc-800 stroke-[2]"/>}
        {appId === "gmail" && <Mail className="w-3/5 h-3/5 text-red-700 fill-white stroke-[2]"/>}
        {appId === "telegram" && <MessageSquare className="w-3/5 h-3/5 text-blue-700 fill-blue-300 stroke-[2]"/>}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-white/10 shadow-md flex items-center justify-center transition-all duration-150 group-hover:border-white/30 group-hover:shadow-lg group-hover:-translate-y-0.5 ${className}`}
    >
      {appId === "explorer" && <Folder className="w-3/5 h-3/5 text-amber-400 fill-amber-400/20"/>}
      {appId === "terminal" && <Terminal className="w-3/5 h-3/5 text-emerald-400"/>}
      {appId === "notes" && <FileText className="w-3/5 h-3/5 text-sky-400 fill-sky-400/10"/>}
      {appId === "settings" && <Settings className="w-3/5 h-3/5 text-slate-300 animate-spin-slow"/>}
      {appId === "trash" && <Trash2 className="w-3/5 h-3/5 text-rose-400"/>}
      {appId === "gmail" && <Mail className="w-3/5 h-3/5 text-red-400"/>}
      {appId === "telegram" && <MessageSquare className="w-3/5 h-3/5 text-blue-400 fill-blue-400/20"/>}
    </div>
  );
}
