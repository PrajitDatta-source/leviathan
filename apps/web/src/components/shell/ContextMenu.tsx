"use client";

import React, { useEffect, useRef, useState } from "react";
import { useThemeStore } from "@/modules/theme/useThemeStore";
import { openWindow } from "@/core/window/manager";
import { Z_INDEX } from "@/core/window/zIndex";
import { 
  Eye, 
  ArrowUpDown, 
  RotateCw, 
  FolderPlus, 
  FileText, 
  Terminal, 
  Settings, 
  ChevronRight
} from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const { osStyle } = useThemeStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<"view" | "sort" | "new" | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  // Viewport bounds protection
  const menuWidth = 220;
  const menuHeight = 260;
  const sw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const sh = typeof window !== "undefined" ? window.innerHeight : 800;

  const posX = x + menuWidth > sw ? Math.max(10, x - menuWidth) : x;
  const posY = y + menuHeight > sh ? Math.max(10, y - menuHeight) : y;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      onClose();
    }, 400);
  };

  const handleOpenTerminal = () => {
    openWindow("terminal");
    onClose();
  };

  const handleOpenSettings = () => {
    openWindow("settings");
    onClose();
  };

  const handleNewTextDocument = () => {
    openWindow("notes");
    onClose();
  };

  const handleNewFolder = () => {
    openWindow("explorer");
    onClose();
  };

  const isRetro = osStyle === "win95-retro";
  const isAero = osStyle === "win7-aero";
  const isMac = osStyle === "macos";

  // Container styling per osStyle
  let containerClasses = "";
  let itemHoverClasses = "";
  let dividerClasses = "";

  if (isMac) {
    containerClasses = "bg-slate-900/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl py-1 text-xs text-white";
    itemHoverClasses = "hover:bg-blue-600 hover:text-white rounded-lg transition-colors";
    dividerClasses = "my-1 border-t border-white/10";
  } else if (isAero) {
    containerClasses = "bg-sky-950/70 backdrop-blur-2xl rounded-lg border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)] p-1 text-xs text-white";
    itemHoverClasses = "hover:bg-white/20 hover:shadow-sm rounded-md transition-all";
    dividerClasses = "my-1 border-t border-white/20";
  } else if (isRetro) {
    containerClasses = "bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-1 text-xs text-black font-sans shadow-none rounded-none";
    itemHoverClasses = "hover:bg-[#000080] hover:text-white rounded-none transition-none";
    dividerClasses = "my-1 border-t border-zinc-500 border-b border-white";
  } else {
    // win11
    containerClasses = "bg-slate-900/90 backdrop-blur-2xl rounded-lg border border-white/10 shadow-xl p-1 text-xs text-white";
    itemHoverClasses = "hover:bg-white/10 rounded-md transition-all";
    dividerClasses = "my-1 border-t border-white/10";
  }

  return (
    <div
      ref={menuRef}
      className={`fixed min-w-[210px] select-none z-50 animate-in fade-in zoom-in-95 duration-100 ${containerClasses}`}
      style={{ left: posX, top: posY, zIndex: Z_INDEX.CONTEXT_MENUS }}
    >
      {/* 1. View Submenu Option */}
      <div 
        className="relative"
        onMouseEnter={() => setActiveSubmenu("view")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button className={`w-full flex items-center justify-between px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}>
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 opacity-80" />
            <span>View</span>
          </div>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </button>

        {activeSubmenu === "view" && (
          <div className={`absolute left-full top-0 ml-1 min-w-[150px] ${containerClasses}`}>
            <button onClick={onClose} className={`w-full text-left px-3 py-1.5 cursor-pointer ${itemHoverClasses}`}>
              Large Icons
            </button>
            <button onClick={onClose} className={`w-full text-left px-3 py-1.5 cursor-pointer ${itemHoverClasses}`}>
              Medium Icons
            </button>
            <button onClick={onClose} className={`w-full text-left px-3 py-1.5 cursor-pointer ${itemHoverClasses}`}>
              Small Icons
            </button>
          </div>
        )}
      </div>

      {/* 2. Sort By Submenu Option */}
      <div 
        className="relative"
        onMouseEnter={() => setActiveSubmenu("sort")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button className={`w-full flex items-center justify-between px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 opacity-80" />
            <span>Sort by</span>
          </div>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </button>

        {activeSubmenu === "sort" && (
          <div className={`absolute left-full top-0 ml-1 min-w-[140px] ${containerClasses}`}>
            <button onClick={onClose} className={`w-full text-left px-3 py-1.5 cursor-pointer ${itemHoverClasses}`}>
              Name
            </button>
            <button onClick={onClose} className={`w-full text-left px-3 py-1.5 cursor-pointer ${itemHoverClasses}`}>
              Size
            </button>
            <button onClick={onClose} className={`w-full text-left px-3 py-1.5 cursor-pointer ${itemHoverClasses}`}>
              Date modified
            </button>
          </div>
        )}
      </div>

      {/* 3. Refresh Action */}
      <button 
        onClick={handleRefresh}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}
      >
        <RotateCw className={`w-3.5 h-3.5 opacity-80 ${refreshing ? "animate-spin" : ""}`} />
        <span>Refresh</span>
      </button>

      <div className={dividerClasses} />

      {/* 4. New Item Submenu Option */}
      <div 
        className="relative"
        onMouseEnter={() => setActiveSubmenu("new")}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button className={`w-full flex items-center justify-between px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}>
          <div className="flex items-center gap-2">
            <FolderPlus className="w-3.5 h-3.5 opacity-80" />
            <span>New</span>
          </div>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </button>

        {activeSubmenu === "new" && (
          <div className={`absolute left-full top-0 ml-1 min-w-[160px] ${containerClasses}`}>
            <button onClick={handleNewFolder} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}>
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Folder</span>
            </button>
            <button onClick={handleNewTextDocument} className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}>
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Text Document</span>
            </button>
          </div>
        )}
      </div>

      <div className={dividerClasses} />

      {/* 5. Open Terminal Here */}
      <button 
        onClick={handleOpenTerminal}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}
      >
        <Terminal className="w-3.5 h-3.5 opacity-80 text-emerald-400" />
        <span>Open Terminal Here</span>
      </button>

      {/* 6. Personalize Settings */}
      <button 
        onClick={handleOpenSettings}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer ${itemHoverClasses}`}
      >
        <Settings className="w-3.5 h-3.5 opacity-80 text-violet-400" />
        <span>Personalize</span>
      </button>
    </div>
  );
}
