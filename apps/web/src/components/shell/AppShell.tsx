"use client";

import { useEffect, useState } from "react";

import { Header } from "./Header";
import { Workspace } from "./Workspace";
import { CommandBar } from "./CommandBar";

import { CommandPalette } from "@/components/command/CommandPalette";

import { bootstrap } from "@/core/bootstrap";

import { Window } from "@/components/window/Window";
import { SettingsWindow } from "@/apps/settings/SettingsWindow";

export function AppShell() {
  const [open, setOpen] = useState(false);

  // Temporary state while we build the real Window Manager
  const [settingsOpen, setSettingsOpen] = useState(true);

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
    <>
      <div className="flex h-screen flex-col bg-black text-white">
        <Header />
        <Workspace />
        <CommandBar />
      </div>

      <CommandPalette
        open={open}
        onOpenChange={setOpen}
      />

      {settingsOpen && (
        <Window
          title="Settings"
          onClose={() => setSettingsOpen(false)}
        >
          <SettingsWindow />
        </Window>
      )}
    </>
  );
}