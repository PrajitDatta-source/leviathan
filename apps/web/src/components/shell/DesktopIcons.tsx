"use client";

import React, { useState, useEffect, useRef } from "react";
import { Folder, FileText, Terminal, Settings, Trash2, Sun, MessageSquare, Mail } from "lucide-react";
import { useWindowStore, useWorkspaceStore, openWindow } from "@/core/window/manager";
import { appRegistry } from "@/core/app";
import { AppIcon } from "@/modules/icons/IconThemeContext";
import { Z_INDEX } from "@/core/window/zIndex";

interface DesktopIcon {
  id: string;
  label: string;
  appId: string;
  icon: React.ComponentType<{ className?: string }>;
  x: number;
  y: number;
}

export function DesktopIcons() {
  const windows = useWindowStore((state) => state.windows);
  const windowWorkspaces = useWorkspaceStore((state) => state.windowWorkspaces);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

  const isOverlapped = (icon: DesktopIcon) => {
    const activeWindows = Object.values(windows).filter(
      (w) => windowWorkspaces[w.id] === activeWorkspace && !w.isMinimized
    );
    const iconWidth = 80;
    const iconHeight = 96;

    return activeWindows.some((w) => {
      if (w.isMaximized) return true;
      return !(
        icon.x + iconWidth <= w.position.x ||
        icon.x >= w.position.x + w.size.width ||
        icon.y + iconHeight <= w.position.y ||
        icon.y >= w.position.y + w.size.height
      );
    });
  };

  const [icons, setIcons] = useState<DesktopIcon[]>([
    { id: "files", label: "Files", appId: "explorer", icon: Folder, x: 20, y: 20 },
    { id: "notes", label: "Notes", appId: "notes", icon: FileText, x: 20, y: 116 },
    { id: "terminal", label: "Terminal", appId: "terminal", icon: Terminal, x: 20, y: 212 },
    { id: "settings", label: "Settings", appId: "settings", icon: Settings, x: 20, y: 308 },
    { id: "weather", label: "Weather", appId: "weather", icon: Sun, x: 20, y: 404 },
    { id: "gmail", label: "Gmail", appId: "gmail", icon: Mail, x: 20, y: 500 },
    { id: "telegram", label: "Telegram", appId: "telegram", icon: MessageSquare, x: 20, y: 596 },
    { id: "trash", label: "Trash", appId: "trash", icon: Trash2, x: 20, y: 692 },
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
      if (editingIconId) return;

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
    openWindow(appId);
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
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: Z_INDEX.DESKTOP_ICONS }}
    >
      {selectionBox && (
        <div
          className="absolute border border-[var(--accent)]/50 bg-[var(--accent)]/10 pointer-events-none rounded"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.startX - selectionBox.currentX),
            height: Math.abs(selectionBox.startY - selectionBox.currentY),
            zIndex: Z_INDEX.DESKTOP_ICONS + 1,
          }}
        />
      )}

      {icons.map((icon) => {
        const isDragging = icon.id === activeDragId;
        const isSelected = selectedIconIds.includes(icon.id);
        const isEditing = icon.id === editingIconId;
        const overlapped = isOverlapped(icon);

        return (
          <div
            key={icon.id}
            onPointerDown={(e) => handlePointerDown(icon.id, e)}
            onDoubleClick={() => handleDoubleClick(icon.appId)}
            className={`desktop-icon-item absolute w-20 flex flex-col items-center gap-1.5 p-1.5 rounded-xl cursor-default select-none border border-transparent pointer-events-auto ${
              isDragging
                ? "bg-[var(--text)]/10 opacity-70 scale-95 border-[var(--text)]/5"
                : isSelected
                ? "bg-[var(--text)]/15 border-[var(--text)]/15 shadow-sm"
                : "hover:bg-[var(--text)]/10 active:scale-95"
            } ${isDragging ? "" : "transition-[left,top] duration-200 ease-out"}`}
            style={{
              left: icon.x,
              top: icon.y,
              touchAction: "none",
              visibility: overlapped ? "hidden" : "visible",
            }}
          >
            <AppIcon
              appId={icon.appId}
              size={48}
              className="group-hover:scale-105 transition-transform duration-100 shadow-md shrink-0 animate-window-open"
            />

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
                className="w-full bg-[var(--surface)] text-[var(--text)] text-[10px] text-center border border-[var(--accent)] rounded px-0.5 outline-none select-text pointer-events-auto"
              />
            ) : (
              <span className="text-[11px] font-semibold text-white text-center tracking-wide drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.95)] truncate max-w-full px-0.5 mt-1 select-none">
                {icon.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
