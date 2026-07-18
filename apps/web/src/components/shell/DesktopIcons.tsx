"use client";

import React, { useState, useEffect, useRef } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun } from "lucide-react";
import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";
import { AppIcon } from "@/modules/icons/IconThemeContext";

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
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const dragOffset = useRef({ x: 0, y: 0 });

  // Handle Drag Selection Box & Click Outside
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      // Ignore click if it lands inside windows, taskbars, inputs, buttons, or custom icons
      if (e.target instanceof HTMLElement) {
        if (
          e.target.closest(".window-instance") ||
          e.target.closest(".taskbar-instance") ||
          e.target.closest(".desktop-icon-item") ||
          e.target.closest("button") ||
          e.target.closest("input")
        ) {
          return;
        }
      }

      if (e.button !== 0) return; // Only left click

      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
      setSelectedIconIds([]);
      setEditingIconId(null);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!selectionBox) return;

      const currentX = e.clientX;
      const currentY = e.clientY;
      setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

      // Calculate Box Intersection boundaries
      const x1 = Math.min(selectionBox.startX, currentX);
      const y1 = Math.min(selectionBox.startY, currentY);
      const x2 = Math.max(selectionBox.startX, currentX);
      const y2 = Math.max(selectionBox.startY, currentY);

      const intersected = icons
        .filter((icon) => {
          const w = 80;
          const h = 80;
          return !(icon.x + w < x1 || icon.x > x2 || icon.y + h < y1 || icon.y > y2);
        })
        .map((icon) => icon.id);

      setSelectedIconIds(intersected);
    };

    const handleGlobalMouseUp = () => {
      setSelectionBox(null);
    };

    window.addEventListener("mousedown", handleGlobalMouseDown);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleGlobalMouseDown);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [selectionBox, icons]);

  // Handle key shortcuts for Delete (removing) and F2 (renaming)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingIconId) return; // Don't interrupt while renaming

      if (e.key === "Delete" && selectedIconIds.length > 0) {
        setIcons((prev) => prev.filter((icon) => !selectedIconIds.includes(icon.id)));
        setSelectedIconIds([]);
      }

      if (e.key === "F2" && selectedIconIds.length === 1) {
        const target = icons.find((icon) => icon.id === selectedIconIds[0]);
        if (target) {
          setEditingIconId(target.id);
          setRenameValue(target.label);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIconIds, icons, editingIconId]);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;

    setActiveDragId(id);
    setEditingIconId(null);

    // Toggle multi-select with Ctrl or Meta key
    if (e.ctrlKey || e.metaKey) {
      setSelectedIconIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      if (!selectedIconIds.includes(id)) {
        setSelectedIconIds([id]);
      }
    }

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

    const maxX = globalThis.innerWidth - 80;
    const maxY = globalThis.innerHeight - 120;
    const boundedX = Math.max(8, Math.min(maxX, newX));
    const boundedY = Math.max(8, Math.min(maxY, newY));

    // Move all selected icons relatively if we are dragging one
    setIcons((prev) =>
      prev.map((icon) =>
        selectedIconIds.includes(icon.id) && icon.id === activeDragId
          ? { ...icon, x: boundedX, y: boundedY }
          : icon
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

        const isOccupied = (x: number, y: number) =>
          prev.some((icon) => icon.id !== activeDragId && icon.x === x && icon.y === y);

        if (isOccupied(targetX, targetY)) {
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
  }, [activeDragId, icons, selectedIconIds]);

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

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim()) {
      setIcons((prev) =>
        prev.map((icon) => (icon.id === id ? { ...icon, label: renameValue.trim() } : icon))
      );
    }
    setEditingIconId(null);
  };

  return (
    <div className="absolute inset-0 pointer-events-auto select-none z-10 overflow-hidden">
      {/* Drag Selection Box overlay */}
      {selectionBox && (
        <div
          className="absolute border border-violet-500/50 bg-violet-500/10 pointer-events-none z-30 rounded"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.startX - selectionBox.currentX),
            height: Math.abs(selectionBox.startY - selectionBox.currentY),
          }}
        />
      )}

      {icons.map((icon) => {
        const isDragging = icon.id === activeDragId;
        const isSelected = selectedIconIds.includes(icon.id);
        const isEditing = icon.id === editingIconId;

        return (
          <div
            key={icon.id}
            onPointerDown={(e) => handlePointerDown(icon.id, e)}
            onDoubleClick={() => handleDoubleClick(icon.appId)}
            className={`desktop-icon-item absolute w-20 flex flex-col items-center gap-1.5 p-1.5 rounded-xl cursor-default select-none border border-transparent ${
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
            {/* Customizable Application Icon Pack */}
            <AppIcon
              appId={icon.appId}
              size={22}
              className="group-hover:scale-105 transition-transform duration-100 shadow-md shrink-0 animate-window-open"
            />

            {/* Label / Input for Renaming */}
            {isEditing ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(icon.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(icon.id);
                  if (e.key === "Escape") setEditingIconId(null);
                }}
                className="w-full bg-[var(--surface)] text-zinc-100 text-[10px] text-center border border-violet-500 rounded px-0.5 outline-none select-text pointer-events-auto"
              />
            ) : (
              <span className="text-[11px] font-medium text-zinc-100 text-center tracking-wide drop-shadow-md truncate max-w-full px-0.5">
                {icon.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
