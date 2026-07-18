"use client";

import React, { useState, useEffect, useRef } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun } from "lucide-react";
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
    { id: "files", label: "Files", appId: "explorer", icon: Folder, x: 20, y: 20 },
    { id: "notes", label: "Notes", appId: "notes", icon: FileText, x: 20, y: 116 },
    { id: "terminal", label: "Terminal", appId: "terminal", icon: Terminal, x: 20, y: 212 },
    { id: "settings", label: "Settings", appId: "settings", icon: Settings, x: 20, y: 308 },
    { id: "weather", label: "Weather", appId: "weather", icon: Sun, x: 20, y: 404 },
    { id: "trash", label: "Trash", appId: "trash", icon: Trash2, x: 20, y: 500 },
  ]);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && !e.target.closest(".desktop-icon-item")) {
        setSelectedIconId(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    // Only drag with left pointer / main click
    if (e.button !== 0) return;

    setActiveDragId(id);
    setSelectedIconId(id);
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
    if (activeDragId) {
      setIcons((prev) => {
        const dragged = prev.find((icon) => icon.id === activeDragId);
        if (!dragged) return prev;

        const cellWidth = 96;
        const cellHeight = 96;
        const margin = 20;

        const col = Math.round((dragged.x - margin) / cellWidth);
        const row = Math.round((dragged.y - margin) / cellHeight);

        const maxCols = Math.floor((globalThis.innerWidth - margin * 2) / cellWidth) - 1;
        const maxRows = Math.floor((globalThis.innerHeight - 48 - margin * 2) / cellHeight) - 1;

        const finalCol = Math.max(0, Math.min(maxCols, col));
        const finalRow = Math.max(0, Math.min(maxRows, row));

        let targetX = margin + finalCol * cellWidth;
        let targetY = margin + finalRow * cellHeight;

        // Check if coordinate is occupied
        const isOccupied = (x: number, y: number) =>
          prev.some((icon) => icon.id !== activeDragId && icon.x === x && icon.y === y);

        if (isOccupied(targetX, targetY)) {
          // Resolve overlap by finding nearest vacant cell in grid
          let found = false;
          for (let c = 0; c <= maxCols && !found; c++) {
            for (let r = 0; r <= maxRows && !found; r++) {
              const testX = margin + c * cellWidth;
              const testY = margin + r * cellHeight;
              if (!isOccupied(testX, testY)) {
                targetX = testX;
                targetY = testY;
                found = true;
              }
            }
          }
        }

        return prev.map((icon) =>
          icon.id === activeDragId ? { ...icon, x: targetX, y: targetY } : icon
        );
      });
    }
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
        const isDragging = icon.id === activeDragId;
        const isSelected = icon.id === selectedIconId;

        return (
          <div
            key={icon.id}
            onPointerDown={(e) => handlePointerDown(icon.id, e)}
            onDoubleClick={() => handleDoubleClick(icon.appId)}
            className={`desktop-icon-item absolute w-20 flex flex-col items-center gap-1.5 p-1.5 rounded-xl pointer-events-auto cursor-default select-none border border-transparent ${
              isDragging
                ? "bg-white/10 opacity-70 scale-95 border-white/5"
                : isSelected
                ? "bg-white/10 border-white/10 shadow-sm"
                : "hover:bg-white/5 active:scale-95"
            } ${isDragging ? "" : "transition-[left,top] duration-200 ease-out"}`}
            style={{
              left: icon.x,
              top: icon.y,
              touchAction: "none",
            }}
          >
            {/* Glossy 3D Fluent Image Icon */}
            <div className="w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-100 bg-zinc-900 border border-white/10">
              <img
                src={`/assets/icons/${icon.appId}.jpg`}
                alt={icon.label}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <span className="text-[11px] font-medium text-zinc-100 text-center tracking-wide drop-shadow-md truncate max-w-full px-0.5">
              {icon.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
