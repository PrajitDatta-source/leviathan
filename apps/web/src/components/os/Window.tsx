"use client";

import React from "react";
import { useThemeStore } from "@/modules/theme/useThemeStore";
import { X, Minus, Square } from "lucide-react";

interface WindowProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Window({ title, children, onClose }: WindowProps) {
  const { osStyle } = useThemeStore();

  // 1. macOS BIG SUR: Top-left traffic lights, sleek rounded frame
  if (osStyle === "macos") {
    return (
      <div className="w-[640px] min-h-[420px] bg-slate-900/80 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        <div className="h-10 px-4 bg-slate-800/50 border-b border-white/10 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 hover:brightness-110 flex items-center justify-center group" />
            <button className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 hover:brightness-110" />
            <button className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 hover:brightness-110" />
          </div>
          <span className="text-xs font-semibold tracking-wide opacity-90">{title}</span>
          <div className="w-12" /> {/* Right spacer for center symmetry */}
        </div>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    );
  }

  // 2. WINDOWS 95 RETRO: Unrounded edges, navy blue title bar, 3D raised border
  if (osStyle === "win95-retro") {
    return (
      <div className="w-[640px] min-h-[420px] bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-1 shadow-none flex flex-col text-black font-sans">
        <div className="h-7 px-2 bg-[#000080] text-white font-bold text-xs tracking-wider flex items-center justify-between select-none">
          <span>{title}</span>
          <div className="flex items-center space-x-1">
            <button className="w-5 h-5 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black text-black font-bold text-[10px] flex items-center justify-center active:border-t-black active:border-l-black">_</button>
            <button className="w-5 h-5 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black text-black font-bold text-[10px] flex items-center justify-center active:border-t-black active:border-l-black">□</button>
            <button onClick={onClose} className="w-5 h-5 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black text-black font-bold text-[10px] flex items-center justify-center active:border-t-black active:border-l-black">✕</button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto border-2 border-t-black border-l-black border-b-white border-r-white mt-1 bg-white">{children}</div>
      </div>
    );
  }

  // 3. WINDOWS 7 AERO GLASS: High translucency, glowing border, red hover close
  if (osStyle === "win7-aero") {
    return (
      <div className="w-[640px] min-h-[420px] bg-slate-900/50 backdrop-blur-2xl border-2 border-white/40 rounded-xl shadow-[0_0_30px_rgba(0,180,255,0.2)] overflow-hidden flex flex-col text-white">
        <div className="h-10 px-4 bg-gradient-to-b from-white/20 to-transparent border-b border-white/20 flex items-center justify-between select-none shadow-inner">
          <span className="text-sm font-semibold drop-shadow">{title}</span>
          <div className="flex items-center space-x-1">
            <button className="p-1.5 hover:bg-white/20 rounded transition-all"><Minus className="w-3.5 h-3.5"/></button>
            <button className="p-1.5 hover:bg-white/20 rounded transition-all"><Square className="w-3.5 h-3.5"/></button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-600 rounded transition-all group"><X className="w-3.5 h-3.5"/></button>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-auto bg-black/40">{children}</div>
      </div>
    );
  }

  // 4. WINDOWS 11 MODERN (Default): Frosted Mica acrylic, clean minimalist top right controls
  return (
    <div className="w-[640px] min-h-[420px] bg-slate-900/75 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col text-white">
      <div className="h-10 px-4 bg-white/5 border-b border-white/10 flex items-center justify-between select-none">
        <span className="text-xs font-medium tracking-wide opacity-90">{title}</span>
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-white/10 rounded transition-all"><Minus className="w-3.5 h-3.5 opacity-70"/></button>
          <button className="p-1 hover:bg-white/10 rounded transition-all"><Square className="w-3 h-3 opacity-70"/></button>
          <button onClick={onClose} className="p-1 hover:bg-red-500 rounded transition-all hover:text-white"><X className="w-3.5 h-3.5 opacity-70 hover:opacity-100"/></button>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-auto">{children}</div>
    </div>
  );
}
