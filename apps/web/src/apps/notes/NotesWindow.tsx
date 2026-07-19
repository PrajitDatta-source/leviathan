"use client";

import React, { useState, useEffect, useRef } from "react";
import { vfs, VFSNode } from "@/modules/filesystem/vfs";
import { Plus, Search, FileText, CheckCircle, Save, Eye } from "lucide-react";

// Simple markdown formatter
function renderMarkdown(md: string): string {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-bold border-b border-zinc-800 pb-2 mt-4 mb-2 text-zinc-100">$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold mt-4 mb-1.5 text-zinc-200">$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1 text-zinc-300">$1</h3>');

  // Checkboxes
  html = html.replace(/^- \[x\] (.*?)$/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="accent-violet-500" /> <span class="line-through text-zinc-500">$1</span></div>');
  html = html.replace(/^- \[ \] (.*?)$/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled /> <span class="text-zinc-300">$1</span></div>');

  // Bullet Lists
  html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc text-zinc-300">$1</li>');

  // Bold / Italic
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong class=\"text-zinc-100\">$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em class=\"text-zinc-300\">$1</em>");

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

export function NotesWindow() {
  const [notes, setNotes] = useState<VFSNode[]>([]);
  const [activeNode, setActiveNode] = useState<VFSNode | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [search, setSearch] = useState("");
  
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const getNotesFolderId = (): string => "notes_folder";

  const loadNotesList = () => {
    const folderId = getNotesFolderId();
    const children = vfs.getChildren(folderId);
    const mdFiles = children.filter((n) => n.type === "file" && n.name.endsWith(".md"));
    setNotes(mdFiles);

    // Default select first note if nothing is active
    if (mdFiles.length > 0 && !activeNode) {
      handleSelectNote(mdFiles[0]);
    }
  };

  useEffect(() => {
    loadNotesList();
    window.addEventListener("vfs-synced", loadNotesList);
    window.addEventListener("vfs-updated", loadNotesList);
    return () => {
      window.removeEventListener("vfs-synced", loadNotesList);
      window.removeEventListener("vfs-updated", loadNotesList);
    };
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
  }, []);

  const handleSelectNote = (note: VFSNode) => {
    setActiveNode(note);
    setNoteTitle(note.name.replace(/\.[^/.]+$/, ""));
    setNoteContent(note.content || "");
    setIsDirty(false);
    setSaveStatus("idle");
  };

  const handleSave = () => {
    if (!activeNode) return;
    vfs.updateFileContent(activeNode.id, noteContent);
    
    // Also rename if title changed
    if (noteTitle.trim()) {
      const ext = activeNode.name.includes(".") ? activeNode.name.split(".").pop() : "md";
      const finalName = noteTitle.trim().endsWith(`.${ext}`) ? noteTitle.trim() : `${noteTitle.trim()}.${ext}`;
      vfs.renameNode(activeNode.id, finalName);
    }
    setSaveStatus("saved");
    setIsDirty(false);
    loadNotesList();
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNode, noteContent, noteTitle]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteContent(val);
    setIsDirty(true);
    triggerAutoSave(activeNode?.id || null, noteTitle, val);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNoteTitle(val);
    setIsDirty(true);
    triggerAutoSave(activeNode?.id || null, val, noteContent);
  };

  const triggerAutoSave = (id: string | null, title: string, content: string) => {
    if (!id) return;
    setSaveStatus("saving");

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      vfs.updateFileContent(id, content);
      if (title.trim()) {
        const ext = activeNode?.name.includes(".") ? activeNode.name.split(".").pop() : "md";
        const finalName = title.trim().endsWith(`.${ext}`) ? title.trim() : `${title.trim()}.${ext}`;
        vfs.renameNode(id, finalName);
      }
      setSaveStatus("saved");
      setIsDirty(false);
      loadNotesList();
    }, 1200);
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
    if (activeNode?.id === id) {
      setActiveNode(null);
      setNoteTitle("");
      setNoteContent("");
    }
    loadNotesList();
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const filteredNotes = notes.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  const linesCount = noteContent.split("\n").length;
  const lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);

  return (
    <div className="flex h-full bg-[var(--background)] text-[var(--text)] select-none text-xs">
      
      {/* Sidebar navigation */}
      <div className="w-[200px] border-r border-[var(--border)] bg-[var(--surface)]/20 p-3 flex flex-col gap-3 shrink-0">
        <button
          onClick={handleCreateNote}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white py-2 text-xs font-semibold shadow transition cursor-pointer"
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
            const isActive = note.id === activeNode?.id;
            return (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`group flex items-center justify-between rounded-lg px-2.5 py-2 cursor-pointer transition ${
                  isActive ? "bg-[var(--border)] font-medium text-white" : "hover:bg-[var(--border)]/40 text-[var(--muted)]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs truncate">{note.name.replace(/\.md$/, "")}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-xs px-1.5 transition cursor-pointer"
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#08080b]">
        {activeNode ? (
          <>
            {/* Toolbar Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3 bg-[var(--surface)]/20 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={noteTitle}
                  onChange={handleTitleChange}
                  placeholder="Note title..."
                  className="bg-transparent font-bold text-base outline-none text-zinc-100 focus:border-b focus:border-zinc-700 w-48"
                />
                
                {/* Unsaved modification dot indicator */}
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-violet-400" title="Unsaved changes" />
                )}
                {!isDirty && (
                  <span className="text-[10px] text-zinc-500 font-mono">({activeNode.name})</span>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Save Status */}
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

                {/* Markdown Toggle */}
                {activeNode.name.endsWith(".md") && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                      showPreview 
                        ? "bg-violet-600/10 border-violet-500/30 text-violet-400" 
                        : "border-[var(--border)] hover:bg-[var(--border)]/40 text-zinc-400"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                )}

                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow cursor-pointer transition text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save (Ctrl+S)</span>
                </button>
              </div>
            </div>

            {/* Split Editor and Preview Pane */}
            <div className="flex-1 flex min-h-0">
              
              {/* Text editor area with gutter numbers */}
              <div className="flex-1 flex min-h-0 border-r border-[var(--border)]">
                
                {/* Line numbers gutter */}
                <div 
                  ref={gutterRef}
                  className="w-10 select-none py-4 text-right pr-2.5 font-mono text-[10px] text-zinc-600 border-r border-zinc-900 bg-[#060608] shrink-0 overflow-y-hidden"
                >
                  {lineNumbers.map((n) => (
                    <div key={n} style={{ height: "20px", lineHeight: "20px" }}>{n}</div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  value={noteContent}
                  onChange={handleContentChange}
                  onScroll={handleScroll}
                  className="flex-1 p-4 bg-transparent resize-none outline-none text-xs font-mono select-text text-zinc-200 leading-[20px] scrollbar-thin scrollbar-thumb-zinc-800"
                  placeholder="Start coding or writing text/markdown..."
                  spellCheck={false}
                />
              </div>

              {/* Renders preview markdown compiler */}
              {activeNode.name.endsWith(".md") && showPreview && (
                <div
                  className="flex-1 p-6 overflow-y-auto select-text text-xs prose prose-invert max-w-none bg-[#09090d] scrollbar-thin scrollbar-thumb-zinc-800"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(noteContent) }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--muted)]">
            <FileText className="w-10 h-10 text-[var(--border)]" />
            <span className="text-xs">Create a new markdown note or select a file to edit.</span>
          </div>
        )}
      </div>
    </div>
  );
}
