"use client";

import React, { useState, useEffect } from "react";
import { Trash2, RotateCcw, FileText, Folder } from "lucide-react";
import { vfs, VFSNode } from "@/modules/filesystem/vfs";

export function TrashWindow() {
  const [trashedNodes, setTrashedNodes] = useState<VFSNode[]>([]);

  const loadTrash = () => {
    setTrashedNodes(vfs.getTrashNodes());
  };

  useEffect(() => {
    loadTrash();
    window.addEventListener("vfs-synced", loadTrash);
    window.addEventListener("vfs-updated", loadTrash);
    return () => {
      window.removeEventListener("vfs-synced", loadTrash);
      window.removeEventListener("vfs-updated", loadTrash);
    };
  }, []);

  const handleRestore = (id: string) => {
    vfs.restoreNode(id);
    loadTrash();
  };

  const handleEmptyTrash = () => {
    vfs.emptyTrash();
    loadTrash();
  };

  if (trashedNodes.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center px-8 text-[var(--text)] select-none">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
          <Trash2 className="w-7 h-7 text-[var(--muted)]" />
        </div>
        <h2 className="text-sm font-semibold">Recycle Bin is empty</h2>
        <p className="text-xs text-[var(--muted)] max-w-xs leading-relaxed">
          Deleted files and folders will appear here until you empty the bin or restore them.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-4 text-[var(--text)] font-sans">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-sm font-semibold">Recycle Bin</h2>
          <p className="text-xs text-[var(--muted)]">{trashedNodes.length} items in trash</p>
        </div>
        <button
          onClick={handleEmptyTrash}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Empty Trash
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {trashedNodes.map((node) => (
          <div
            key={node.id}
            className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              {node.type === "folder" ? (
                <Folder className="w-4 h-4 text-cyan-400" />
              ) : (
                <FileText className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <div className="text-xs font-medium text-white">{node.name}</div>
                {node.deletedAt && (
                  <div className="text-[10px] font-mono text-[var(--muted)]">
                    Deleted {new Date(node.deletedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => handleRestore(node.id)}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
