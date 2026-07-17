"use client";

import * as Dialog from "@radix-ui/react-dialog";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-24 w-[600px] -translate-x-1/2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
          <input
            autoFocus
            placeholder="Type a command..."
            className="w-full bg-transparent text-lg outline-none"
          />

          <div className="mt-4 text-sm text-zinc-400">
            No commands yet.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}