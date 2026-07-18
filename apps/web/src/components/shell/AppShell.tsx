"use client";

import { useEffect, useState } from "react";

import { Header } from "./Header";
import { Workspace } from "./Workspace";
import { CommandBar } from "./CommandBar";
import { Taskbar } from "./Taskbar";

import { CommandPalette } from "@/components/command/CommandPalette";
import { Desktop } from "@/components/window/Desktop";

import { bootstrap } from "@/core/bootstrap";
import { WindowManagerProvider } from "@/core/window/manager";

export function AppShell() {
  const [open, setOpen] = useState(false);

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

  return (
    <WindowManagerProvider>
      <div className="flex h-screen flex-col bg-black text-white">
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
    </WindowManagerProvider>
  );
}