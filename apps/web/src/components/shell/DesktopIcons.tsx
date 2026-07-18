"use client";

import React, { useState, useEffect, useRef } from "react";
import { Folder, FileText, Terminal, Settings, Trash2 } from "lucide-react";
import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";

interface DesktopIcon {
  id: string;
  label: string;
  appId: string;
  icon: React.ComponentType<{ className?: string }>;
  x: number;
  y: number;
}

export function DesktopIcons() {
  const manager = useWindowManager();
  const [icons, setIcons] = useState<DesktopIcon[]>([
    { id: "files", label: "Files", appId: "explorer", icon: Folder, x: 24, y: 24 },
    { id: "notes", label: "Notes", appId: "notes", icon: FileText, x: 24, y: 124 },
    { id: "terminal", label: "Terminal", appId: "terminal", icon: Terminal, x: 24, y: 224 },
    { id: "settings", label: "Settings", appId: "settings", icon: Settings, x: 24, y: 324 },
    { id: "trash", label: "Trash", appId: "trash", icon: Trash2, x: 24, y: 424 },
  ]);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    // Only drag with left pointer / main click
    if (e.button !== 0) return;

    setActiveDragId(id);
    const targetIcon = icons.find((icon) => icon.id === id);
    if (targetIcon) {
      dragOffset.current = {
        x: e.clientX - targetIcon.x,
        y: e.clientY - targetIcon.y,
      };
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!activeDragId) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    // Constrain inside viewport boundaries
    const maxX = globalThis.innerWidth - 80;
    const maxY = globalThis.innerHeight - 120; // Above taskbar
    const boundedX = Math.max(8, Math.min(maxX, newX));
    const boundedY = Math.max(8, Math.min(maxY, newY));

    setIcons((prev) =>
      prev.map((icon) =>
        icon.id === activeDragId ? { ...icon, x: boundedX, y: boundedY } : icon
      )
    );
  };

  const handlePointerUp = () => {
    setActiveDragId(null);
  };

  useEffect(() => {
    if (activeDragId) {
      globalThis.addEventListener("pointermove", handlePointerMove);
      globalThis.addEventListener("pointerup", handlePointerUp);
    } else {
      globalThis.removeEventListener("pointermove", handlePointerMove);
      globalThis.removeEventListener("pointerup", handlePointerUp);
    }
    return () => {
      globalThis.removeEventListener("pointermove", handlePointerMove);
      globalThis.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeDragId, icons]);

  const handleDoubleClick = (appId: string) => {
    if (appId === "trash") {
      alert("Trash is currently empty.");
      return;
    }

    const app = appRegistry.get(appId);
    if (app) {
      manager.open({
        id: appId,
        title: app.title,
        content: React.createElement(app.component),
        width: app.width || 700,
        height: app.height || 500,
      });
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10">
      {icons.map((icon) => {
        const IconComponent = icon.icon;
        const isDragging = icon.id === activeDragId;

        return (
          <div
            key={icon.id}
            onPointerDown={(e) => handlePointerDown(icon.id, e)}
            onDoubleClick={() => handleDoubleClick(icon.appId)}
            className={`absolute w-20 flex flex-col items-center gap-1.5 p-2 rounded-xl pointer-events-auto cursor-default transition-all duration-75 select-none ${
              isDragging
                ? "bg-white/10 opacity-75 scale-95 border border-white/5"
                : "hover:bg-white/5 border border-transparent active:scale-95"
            }`}
            style={{
              left: icon.x,
              top: icon.y,
              touchAction: "none",
            }}
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-105 transition-transform duration-100 shadow-sm">
              <IconComponent className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium text-zinc-200 text-center tracking-wide drop-shadow-md truncate max-w-full px-0.5">
              {icon.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
