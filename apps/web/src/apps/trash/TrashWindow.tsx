"use client";

import React from "react";
import { Trash2 } from "lucide-react";

/**
 * Recycle Bin. Iris's VFS (modules/filesystem/vfs.ts) currently deletes
 * nodes permanently rather than moving them to a trash collection, so this
 * is an honest empty-state window rather than a fake list — it explains
 * what "delete" currently does instead of pretending recovery is possible.
 * Swap this for a real trashed-nodes list once VFS supports soft-delete.
 */
export function TrashWindow() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center px-8 text-[var(--text)]">
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
        <Trash2 className="w-7 h-7 text-[var(--muted)]" />
      </div>
      <h2 className="text-sm font-semibold">Recycle Bin is empty</h2>
      <p className="text-xs text-[var(--muted)] max-w-xs leading-relaxed">
        Deleting a file or desktop icon in Iris removes it immediately —
        there&rsquo;s no recovery yet, so nothing ever lands here. This
        window is a placeholder for that feature.
      </p>
    </div>
  );
}
