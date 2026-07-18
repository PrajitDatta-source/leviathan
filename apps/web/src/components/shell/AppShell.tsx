"use client";

import { useEffect, useState } from "react";

import { Header } from "./Header";
import { Workspace } from "./Workspace";
import { CommandBar } from "./CommandBar";
import { Taskbar } from "./Taskbar";

import { CommandPalette } from "@/components/command/CommandPalette";
import { Desktop } from "@/components/window/Desktop";
import { ContextMenu } from "./ContextMenu";

import { bootstrap } from "@/core/bootstrap";
import { WindowManagerProvider } from "@/core/window/manager";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    bootstrap();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      const isInsideWindow = e.target.closest(".window-instance") || e.target.closest("button") || e.target.closest("input");
      if (isInsideWindow) return;
    }
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleLeftClick = () => {
    if (contextMenu) {
      setContextMenu(null);
    }
  };

  return (
    <WindowManagerProvider>
      <div 
        onContextMenu={handleContextMenu}
        onClick={handleLeftClick}
        className="flex h-screen flex-col text-white relative overflow-hidden select-none"
        style={{ background: "var(--wallpaper)" }}
      >
        <Header />
        <Workspace />
        <CommandBar />
      </div>

      <Desktop />
      <Taskbar />

      <CommandPalette
        open={open}
        onOpenChange={setOpen}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </WindowManagerProvider>
  );
}