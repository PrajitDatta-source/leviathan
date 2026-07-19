"use client";

import React, { useState, useEffect, useRef } from "react";
import { vfs, VFSNode } from "@/modules/filesystem/vfs";
import { openWindow } from "@/core/window/manager";
import { 
  Folder, 
  File, 
  ArrowUp, 
  Plus, 
  Upload, 
  Download, 
  Trash, 
  Edit, 
  Grid, 
  List, 
  Search, 
  Copy, 
  Scissors, 
  Clipboard 
} from "lucide-react";

type ViewMode = "grid" | "list";

interface ContextMenuState {
  x: number;
  y: number;
  node: VFSNode | null;
}

export function ExplorerWindow() {
  const [currentDirId, setCurrentDirId] = useState<string | null>(null);
  const [children, setChildren] = useState<VFSNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Inline rename state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDirectory = () => {
    setChildren(vfs.getChildren(currentDirId));
    setSelectedNodeId(null);
  };

  useEffect(() => {
    loadDirectory();
    window.addEventListener("vfs-synced", loadDirectory);
    window.addEventListener("vfs-updated", loadDirectory);
    return () => {
      window.removeEventListener("vfs-synced", loadDirectory);
      window.removeEventListener("vfs-updated", loadDirectory);
    };
  }, [currentDirId]);

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ dirId: string | null }>;
      if (customEvent.detail && customEvent.detail.dirId !== undefined) {
        setCurrentDirId(customEvent.detail.dirId);
      }
    };
    window.addEventListener("explorer-navigate", handleNavigate);
    return () => window.removeEventListener("explorer-navigate", handleNavigate);
  }, []);

  // Dismiss context menu on click
  useEffect(() => {
    const handleDismiss = () => setContextMenu(null);
    window.addEventListener("click", handleDismiss);
    return () => window.removeEventListener("click", handleDismiss);
  }, []);

  const handleDoubleClick = (node: VFSNode) => {
    if (node.type === "folder") {
      setCurrentDirId(node.id);
    } else {
      const isTextFile = 
        node.name.endsWith(".md") || 
        node.name.endsWith(".txt") || 
        node.name.endsWith(".json") || 
        node.name.endsWith(".js") || 
        node.name.endsWith(".ts");
      if (isTextFile) {
        window.dispatchEvent(new CustomEvent("notes-open-file", { detail: { fileId: node.id } }));
        openWindow("notes");
      } else {
        alert(`Opening file: ${node.name}\nSize: ${node.content?.length || 0} bytes`);
      }
    }
  };

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (name && name.trim()) {
      vfs.createFolder(name.trim(), currentDirId);
      loadDirectory();
    }
  };

  const handleCreateFile = () => {
    const name = prompt("Enter file name (e.g. text.txt, note.md):");
    if (name && name.trim()) {
      vfs.createFile(name.trim(), currentDirId, "Start editing this file...");
      loadDirectory();
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      vfs.createFile(file.name, currentDirId, content);
      loadDirectory();
    };
    reader.readAsText(file);
  };

  const handleDownloadFile = (node: VFSNode) => {
    if (node.type === "folder") return;

    const blob = new Blob([node.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = node.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startRenameInline = (node: VFSNode) => {
    setEditingNodeId(node.id);
    setEditingName(node.name);
  };

  const finishRename = () => {
    if (!editingNodeId) return;
    const name = editingName.trim();
    if (name) {
      vfs.renameNode(editingNodeId, name);
      loadDirectory();
    }
    setEditingNodeId(null);
  };

  const handleRename = (node: VFSNode) => {
    startRenameInline(node);
  };

  const handleDelete = (node: VFSNode) => {
    if (confirm(`Are you sure you want to delete '${node.name}'?`)) {
      vfs.deleteNode(node.id);
      loadDirectory();
    }
  };

  const handleGoUp = () => {
    if (currentDirId) {
      const node = vfs.getNode(currentDirId);
      if (node) {
        setCurrentDirId(node.parentId);
      }
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, node: VFSNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node
    });
  };

  const handleEmptySpaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node: null
    });
  };

  const handlePaste = () => {
    const clipboard = vfs.getClipboard();
    if (!clipboard) return;

    if (clipboard.type === "copy") {
      vfs.copyNode(clipboard.nodeId, currentDirId);
    } else if (clipboard.type === "cut") {
      vfs.moveNode(clipboard.nodeId, currentDirId);
      vfs.clearClipboard();
    }
    loadDirectory();
  };

  const getBreadcrumbs = () => {
    if (!currentDirId) return [];
    return vfs.getPath(currentDirId);
  };

  const filteredChildren = children.filter((node) =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[var(--background)] text-[var(--text)] select-none text-xs relative">
      
      {/* Absolute context menu overlay */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y - 40, left: contextMenu.x - 60 }}
          className="absolute z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl py-1.5 w-40 text-xs shadow-2xl backdrop-blur-md text-zinc-300 font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node ? (
            <>
              <button
                onClick={() => { startRenameInline(contextMenu.node!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--border)]/40 hover:text-zinc-100 flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-violet-400" />
                <span>Rename</span>
              </button>
              <button
                onClick={() => { vfs.setClipboard("copy", contextMenu.node!.id); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--border)]/40 hover:text-zinc-100 flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-violet-400" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => { vfs.setClipboard("cut", contextMenu.node!.id); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--border)]/40 hover:text-zinc-100 flex items-center gap-2 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-violet-400" />
                <span>Cut</span>
              </button>
              <button
                onClick={() => { handleDelete(contextMenu.node!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--border)]/40 text-rose-400 flex items-center gap-2 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { handlePaste(); setContextMenu(null); }}
                disabled={!vfs.getClipboard()}
                className="w-full text-left px-4 py-2 hover:bg-[var(--border)]/40 hover:text-zinc-100 flex items-center gap-2 cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-300"
              >
                <Clipboard className="w-3.5 h-3.5 text-violet-400" />
                <span>Paste</span>
              </button>
              <div className="h-[1px] bg-[var(--border)] my-1" />
              <button
                onClick={() => { handleCreateFolder(); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--border)]/40 hover:text-zinc-100 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-violet-400" />
                <span>New Folder</span>
              </button>
              <button
                onClick={() => { handleCreateFile(); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--border)]/40 hover:text-zinc-100 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-violet-400" />
                <span>New File</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Explorer Sidebar */}
      <div className="w-44 border-r border-[var(--border)] bg-[var(--surface)]/10 p-3 flex flex-col gap-1.5 shrink-0">
        <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] mb-2 px-2.5">
          Navigation
        </div>

        <button
          onClick={() => setCurrentDirId(null)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--border)]/40 hover:text-[var(--text)] text-left transition cursor-pointer ${currentDirId === null ? "bg-[var(--border)] text-[var(--text)]" : ""}`}
        >
          <Folder className="w-3.5 h-3.5 text-violet-400" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentDirId("downloads_folder")}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--border)]/40 hover:text-[var(--text)] text-left transition cursor-pointer ${currentDirId === "downloads_folder" ? "bg-[var(--border)] text-[var(--text)]" : ""}`}
        >
          <Folder className="w-3.5 h-3.5 text-violet-400" />
          <span>Downloads</span>
        </button>

        <button
          onClick={() => setCurrentDirId("documents_folder")}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--border)]/40 hover:text-[var(--text)] text-left transition cursor-pointer ${currentDirId === "documents_folder" ? "bg-[var(--border)] text-[var(--text)]" : ""}`}
        >
          <Folder className="w-3.5 h-3.5 text-violet-400" />
          <span>Documents</span>
        </button>
      </div>

      {/* Explorer Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Navigation Toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface)]/20 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={handleGoUp}
              disabled={currentDirId === null}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 font-medium truncate">
              <span
                onClick={() => setCurrentDirId(null)}
                className="hover:underline cursor-pointer"
              >
                Home
              </span>
              {getBreadcrumbs().map((b) => (
                <React.Fragment key={b.id}>
                  <span className="text-[var(--muted)]">/</span>
                  <span
                    onClick={() => setCurrentDirId(b.id)}
                    className="hover:underline cursor-pointer truncate max-w-[100px]"
                  >
                    {b.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 rounded-xl w-40 shrink-0">
            <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[var(--text)] outline-none w-full placeholder-[var(--muted)] text-[10px]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition cursor-pointer font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>

            <button
              onClick={handleCreateFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition cursor-pointer font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition cursor-pointer font-semibold"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadFile}
              className="hidden"
            />

            <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />

            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition cursor-pointer"
              title="Toggle View Mode"
            >
              {viewMode === "grid" ? <List className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Directory Listing */}
        <div 
          className="flex-1 overflow-y-auto p-4"
          onContextMenu={handleEmptySpaceContextMenu}
        >
          {filteredChildren.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
              This folder is empty.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {filteredChildren.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isEditing = node.id === editingNodeId;
                return (
                  <div
                    key={node.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                    onDoubleClick={() => handleDoubleClick(node)}
                    onContextMenu={(e) => handleNodeContextMenu(e, node)}
                    className={`flex flex-col items-center p-2 rounded-xl text-center cursor-pointer group transition border ${
                      isSelected ? "bg-violet-500/10 border-violet-500/30" : "hover:bg-[var(--border)]/30 border-transparent"
                    }`}
                  >
                    {node.type === "folder" ? (
                      <Folder className="w-8 h-8 text-violet-400 group-hover:scale-105 transition" />
                    ) : (
                      <File className="w-8 h-8 text-indigo-400 group-hover:scale-105 transition" />
                    )}

                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={finishRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") finishRename();
                          if (e.key === "Escape") setEditingNodeId(null);
                        }}
                        className="bg-[var(--surface)] text-[var(--text)] border border-violet-500 rounded px-1 mt-1 text-[10px] outline-none w-full text-center"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-[11px] font-medium mt-2 truncate w-full px-1">{node.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col text-xs">
              {/* Header */}
              <div className="flex border-b border-[var(--border)] pb-2 font-semibold text-[var(--muted)] mb-2 px-2">
                <span className="flex-1">Name</span>
                <span className="w-20">Type</span>
                <span className="w-28 text-right">Modified</span>
              </div>
              {/* Rows */}
              {filteredChildren.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isEditing = node.id === editingNodeId;
                return (
                  <div
                    key={node.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                    onDoubleClick={() => handleDoubleClick(node)}
                    onContextMenu={(e) => handleNodeContextMenu(e, node)}
                    className={`flex py-2 px-2 rounded-lg cursor-pointer transition items-center ${
                      isSelected ? "bg-violet-500/10" : "hover:bg-[var(--border)]/20"
                    }`}
                  >
                    <span className="flex-1 flex items-center gap-2 font-medium">
                      {node.type === "folder" ? (
                        <Folder className="w-3.5 h-3.5 text-violet-400" />
                      ) : (
                        <File className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={finishRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") finishRename();
                            if (e.key === "Escape") setEditingNodeId(null);
                          }}
                          className="bg-[var(--surface)] text-[var(--text)] border border-violet-500 rounded px-1.5 py-0.5 text-xs outline-none w-48"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span>{node.name}</span>
                      )}
                    </span>
                    <span className="w-20 text-[var(--muted)] capitalize">{node.type}</span>
                    <span className="w-28 text-right text-[var(--muted)]">
                      {new Date(node.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Statusbar / Context Pane */}
        {selectedNodeId && (
          <div className="border-t border-[var(--border)] px-4 py-2.5 bg-[var(--surface)]/30 flex items-center justify-between text-xs shrink-0">
            <span className="font-medium text-[var(--muted)] truncate max-w-[200px]">
              Selected: {children.find((n) => n.id === selectedNodeId)?.name}
            </span>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const node = children.find((n) => n.id === selectedNodeId);
                  if (node) handleRename(node);
                }}
                className="flex items-center gap-1 hover:text-violet-400 transition cursor-pointer"
              >
                <Edit className="w-3 h-3" />
                <span>Rename</span>
              </button>

              {children.find((n) => n.id === selectedNodeId)?.type === "file" && (
                <button
                  onClick={() => {
                    const node = children.find((n) => n.id === selectedNodeId);
                    if (node) handleDownloadFile(node);
                  }}
                  className="flex items-center gap-1 hover:text-violet-400 transition cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              )}

              <button
                onClick={() => {
                  const node = children.find((n) => n.id === selectedNodeId);
                  if (node) handleDelete(node);
                }}
                className="flex items-center gap-1 hover:text-rose-500 text-rose-400 transition cursor-pointer"
              >
                <Trash className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
