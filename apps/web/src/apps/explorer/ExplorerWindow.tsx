"use client";

import React, { useState, useEffect, useRef } from "react";
import { vfs, VFSNode } from "@/modules/filesystem/vfs";
import { useWindowManager } from "@/core/window/hooks";
import { Folder, File, ArrowUp, Plus, Upload, Download, Trash, Edit, Grid, List, Search } from "lucide-react";
import { NotesWindow } from "../notes/NotesWindow";

type ViewMode = "grid" | "list";

export function ExplorerWindow() {
  const manager = useWindowManager();
  const [currentDirId, setCurrentDirId] = useState<string | null>(null);
  const [children, setChildren] = useState<VFSNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getNotesFolderId = (): string | null => {
    const rootNodes = vfs.getChildren(null);
    const home = rootNodes.find((n) => n.name === "Home");
    if (home) {
      const homeChildren = vfs.getChildren(home.id);
      const notesFolder = homeChildren.find((n) => n.name === "Notes" && n.type === "folder");
      return notesFolder ? notesFolder.id : home.id;
    }
    return null;
  };

  const loadDirectory = () => {
    // Default to Home folder on load
    if (currentDirId === null) {
      const rootFolders = vfs.getChildren(null);
      const home = rootFolders.find((n) => n.name === "Home");
      if (home) {
        setCurrentDirId(home.id);
        setChildren(vfs.getChildren(home.id));
        return;
      }
    }
    setChildren(vfs.getChildren(currentDirId));
    setSelectedNodeId(null);
  };

  useEffect(() => {
    loadDirectory();
    window.addEventListener("vfs-synced", loadDirectory);
    return () => window.removeEventListener("vfs-synced", loadDirectory);
  }, [currentDirId]);

  const handleDoubleClick = (node: VFSNode) => {
    if (node.type === "folder") {
      setCurrentDirId(node.id);
    } else {
      // File double-click: if markdown, open in Notes app!
      if (node.name.endsWith(".md")) {
        manager.open({
          id: "notes",
          title: "Notes",
          content: React.createElement(NotesWindow),
          width: 800,
          height: 550,
        });
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

  const handleRename = (node: VFSNode) => {
    const newName = prompt(`Rename '${node.name}' to:`, node.name.replace(/\.md$/, ""));
    if (newName && newName.trim()) {
      const finalName = node.type === "file" && node.name.endsWith(".md") && !newName.endsWith(".md") 
        ? `${newName.trim()}.md`
        : newName.trim();
      vfs.renameNode(node.id, finalName);
      loadDirectory();
    }
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

  const getBreadcrumbs = () => {
    if (!currentDirId) return [];
    return vfs.getPath(currentDirId);
  };

  const filteredChildren = children.filter((node) =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[var(--background)] text-[var(--text)] select-none">
      {/* Sidebar Links */}
      <div className="w-[160px] border-r border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-col gap-1.5 shrink-0 text-xs text-[var(--muted)]">
        <h2 className="font-bold uppercase tracking-wider text-[var(--muted)] px-2 mb-2">Places</h2>
        
        <button
          onClick={() => {
            const rootFolders = vfs.getChildren(null);
            const home = rootFolders.find((n) => n.name === "Home");
            if (home) setCurrentDirId(home.id);
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--border)]/40 hover:text-[var(--text)] text-left transition"
        >
          <Folder className="w-3.5 h-3.5 text-violet-400" />
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            const notesId = getNotesFolderId();
            if (notesId) setCurrentDirId(notesId);
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--border)]/40 hover:text-[var(--text)] text-left transition"
        >
          <Folder className="w-3.5 h-3.5 text-violet-400" />
          <span>Notes</span>
        </button>
      </div>

      {/* Explorer Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navigation Toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface)]/20 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={handleGoUp}
              disabled={currentDirId === null || vfs.getNode(currentDirId)?.parentId === null}
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 disabled:opacity-30 disabled:hover:bg-transparent transition"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 font-medium truncate">
              <span
                onClick={() => setCurrentDirId(null)}
                className="hover:underline cursor-pointer"
              >
                Root
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

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>

            <button
              onClick={handleCreateFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition"
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
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]/40 transition"
              title="Toggle View Mode"
            >
              {viewMode === "grid" ? <List className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Directory Listing */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredChildren.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
              This folder is empty.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {filteredChildren.map((node) => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    onDoubleClick={() => handleDoubleClick(node)}
                    className={`flex flex-col items-center p-2 rounded-xl text-center cursor-default group transition ${
                      isSelected ? "bg-violet-500/10 border border-violet-500/30" : "hover:bg-[var(--border)]/30 border border-transparent"
                    }`}
                  >
                    {node.type === "folder" ? (
                      <Folder className="w-8 h-8 text-violet-400 group-hover:scale-105 transition" />
                    ) : (
                      <File className="w-8 h-8 text-indigo-400 group-hover:scale-105 transition" />
                    )}
                    <span className="text-[11px] font-medium mt-2 truncate w-full px-1">{node.name}</span>
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
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    onDoubleClick={() => handleDoubleClick(node)}
                    className={`flex py-2 px-2 rounded-lg cursor-default transition ${
                      isSelected ? "bg-violet-500/10" : "hover:bg-[var(--border)]/20"
                    }`}
                  >
                    <span className="flex-1 flex items-center gap-2 font-medium">
                      {node.type === "folder" ? (
                        <Folder className="w-3.5 h-3.5 text-violet-400" />
                      ) : (
                        <File className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      <span>{node.name}</span>
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
                className="flex items-center gap-1 hover:text-violet-400 transition"
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
                  className="flex items-center gap-1 hover:text-violet-400 transition"
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
                className="flex items-center gap-1 hover:text-rose-500 text-rose-400 transition"
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
