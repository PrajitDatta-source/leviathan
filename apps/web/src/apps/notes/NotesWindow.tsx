"use client";

import React, { useState, useEffect, useRef } from "react";
import { vfs, VFSNode } from "@/modules/filesystem/vfs";
import { Plus, Search, FileText, CheckCircle, Save } from "lucide-react";

// Simple markdown formatter
function renderMarkdown(md: string): string {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-bold border-b border-zinc-800 pb-2 mt-4 mb-2">$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold mt-4 mb-1.5">$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>');

  // Checkboxes
  html = html.replace(/^- \[x\] (.*?)$/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="accent-violet-500" /> <span class="line-through text-zinc-500">$1</span></div>');
  html = html.replace(/^- \[ \] (.*?)$/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled /> <span>$1</span></div>');

  // Bullet Lists
  html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // Bold / Italic
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

export function NotesWindow() {
  const [notes, setNotes] = useState<VFSNode[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Find the Notes folder in VFS on load
  const getNotesFolderId = (): string => {
    return "notes_folder";
  };

  const loadNotesList = () => {
    const folderId = getNotesFolderId();
    const children = vfs.getChildren(folderId);
    const mdFiles = children.filter((n) => n.type === "file" && n.name.endsWith(".md"));
    setNotes(mdFiles);

    // Default select first note if nothing is active
    if (mdFiles.length > 0 && !selectedNoteId) {
      handleSelectNote(mdFiles[0]);
    }
  };

  useEffect(() => {
    loadNotesList();
    window.addEventListener("vfs-synced", loadNotesList);
    return () => window.removeEventListener("vfs-synced", loadNotesList);
  }, []);

  useEffect(() => {
    const handleOpenFile = (e: Event) => {
      const customEvent = e as CustomEvent<{ fileId: string }>;
      if (customEvent.detail && customEvent.detail.fileId) {
        const fileNode = vfs.getNode(customEvent.detail.fileId);
        if (fileNode) {
          handleSelectNote(fileNode);
        }
      }
    };
    window.addEventListener("notes-open-file", handleOpenFile);
    return () => window.removeEventListener("notes-open-file", handleOpenFile);
  }, [notes]);

  const handleSelectNote = (note: VFSNode) => {
    setSelectedNoteId(note.id);
    setNoteTitle(note.name.replace(/\.md$/, ""));
    setNoteContent(note.content || "");
    setSaveStatus("idle");
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteContent(val);
    triggerAutoSave(selectedNoteId, noteTitle, val);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNoteTitle(val);
    triggerAutoSave(selectedNoteId, val, noteContent);
  };

  const triggerAutoSave = (id: string | null, title: string, content: string) => {
    if (!id) return;
    setSaveStatus("saving");

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      // Save changes back to virtual filesystem
      vfs.updateFileContent(id, content);
      if (title.trim()) {
        vfs.renameNode(id, `${title.trim()}.md`);
      }
      setSaveStatus("saved");
      loadNotesList();
    }, 1000);
  };

  const handleCreateNote = () => {
    const parentId = getNotesFolderId();
    const node = vfs.createFile("Untitled.md", parentId, "# New Note\n\nStart writing markdown here...");
    loadNotesList();
    handleSelectNote(node);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    vfs.deleteNode(id);
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
      setNoteTitle("");
      setNoteContent("");
    }
    loadNotesList();
  };

  const filteredNotes = notes.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[var(--background)] text-[var(--text)] select-none">
      {/* Sidebar navigation */}
      <div className="w-[220px] border-r border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-3 shrink-0">
        <button
          onClick={handleCreateNote}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white py-2 text-xs font-semibold shadow transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text)] outline-none placeholder-[var(--muted)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {filteredNotes.map((note) => {
            const isActive = note.id === selectedNoteId;
            return (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`group flex items-center justify-between rounded-lg px-2.5 py-2 cursor-default transition ${
                  isActive ? "bg-[var(--border)] font-medium" : "hover:bg-[var(--border)]/40 text-[var(--muted)]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs truncate">{note.name.replace(/\.md$/, "")}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-xs px-1.5 transition"
                  title="Delete Note"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor & Preview Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
        {selectedNoteId ? (
          <>
            {/* Toolbar Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3 bg-[var(--surface)]/20 shrink-0">
              <input
                value={noteTitle}
                onChange={handleTitleChange}
                placeholder="Note title..."
                className="bg-transparent font-bold text-base outline-none text-[var(--text)]"
              />
              
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                {saveStatus === "saving" && (
                  <>
                    <Save className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                )}
              </div>
            </div>

            {/* Split Editor and Preview Pane */}
            <div className="flex-1 flex min-h-0">
              {/* Markdown input */}
              <textarea
                value={noteContent}
                onChange={handleContentChange}
                className="flex-1 p-6 bg-transparent resize-none border-r border-[var(--border)] outline-none text-xs font-mono select-text"
                placeholder="Markdown text..."
              />

              {/* Renders preview markdown compiler */}
              <div
                className="flex-1 p-6 overflow-y-auto select-text text-sm prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(noteContent) }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--muted)]">
            <FileText className="w-10 h-10 text-[var(--border)]" />
            <span className="text-xs">Create or select a markdown note.</span>
          </div>
        )}
      </div>
    </div>
  );
}
