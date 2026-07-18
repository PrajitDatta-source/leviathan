"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { commandRegistry } from "@/core/command";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const commands = commandRegistry.getAll();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-24 w-[650px] -translate-x-1/2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">

          <input
            autoFocus
            placeholder="Type a command..."
            className="w-full border-b border-zinc-800 bg-transparent pb-3 text-lg outline-none"
          />

          <div className="mt-4 space-y-2">

            {commands.map((command) => (
              <button
                key={command.id}
                onClick={() => {
                  command.run();
                  onOpenChange(false);
                }}
                className="flex w-full flex-col rounded-lg p-3 text-left transition hover:bg-zinc-800"
              >
                <span className="font-medium">
                  {command.title}
                </span>

                {command.description && (
                  <span className="text-sm text-zinc-400">
                    {command.description}
                  </span>
                )}
              </button>
            ))}

          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}