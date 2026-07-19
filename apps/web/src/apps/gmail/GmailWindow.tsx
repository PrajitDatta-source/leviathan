"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Inbox, 
  Send, 
  FileText, 
  Search, 
  Star, 
  Trash2, 
  Plus, 
  Mail, 
  MailOpen, 
  ChevronRight, 
  ChevronLeft,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { MailService, MailThread, MailMessage } from "@/core/services/MailService";

export function GmailWindow() {
  const [folder, setFolder] = useState<"inbox" | "sent" | "drafts">("inbox");
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<MailThread | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Compose states
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  
  // Keyboard index
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    let list: MailThread[] = [];
    if (searchQuery.trim()) {
      list = await MailService.searchThreads(searchQuery);
    } else {
      list = await MailService.getThreads(folder);
    }
    setThreads(list);
    setKeyboardIndex(-1);
  };

  useEffect(() => {
    loadThreads();
  }, [folder, searchQuery]);

  useEffect(() => {
    if (selectedThreadId) {
      MailService.getThreadById(selectedThreadId).then(thread => {
        setSelectedThread(thread);
        if (thread && !thread.isRead) {
          MailService.markAsRead(thread.id, true).then(() => {
            loadThreads();
          });
        }
      });
    } else {
      setSelectedThread(null);
    }
  }, [selectedThreadId]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts if user is typing in inputs or textareas
      if (
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setKeyboardIndex(prev => Math.min(threads.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setKeyboardIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (keyboardIndex >= 0 && keyboardIndex < threads.length) {
          setSelectedThreadId(threads[keyboardIndex].id);
        }
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsComposing(true);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        const activeIdx = keyboardIndex >= 0 ? keyboardIndex : threads.findIndex(t => t.id === selectedThreadId);
        if (activeIdx >= 0) {
          MailService.toggleStar(threads[activeIdx].id).then(() => loadThreads());
        }
      } else if (e.key === "Backspace" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        const activeIdx = keyboardIndex >= 0 ? keyboardIndex : threads.findIndex(t => t.id === selectedThreadId);
        if (activeIdx >= 0) {
          MailService.deleteThread(threads[activeIdx].id).then(() => {
            setSelectedThreadId(null);
            loadThreads();
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [threads, keyboardIndex, selectedThreadId]);

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) return;

    await MailService.compose(composeTo, composeSubject, composeBody);
    setIsComposing(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    loadThreads();
  };

  const handleToggleStar = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    await MailService.toggleStar(threadId);
    loadThreads();
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    await MailService.deleteThread(threadId);
    if (selectedThreadId === threadId) {
      setSelectedThreadId(null);
    }
    loadThreads();
  };

  // Helper to count unread messages in inbox
  const unreadCount = threads.filter(t => !t.isRead && t.messages.some(m => m.folder === "inbox")).length;

  return (
    <div ref={containerRef} className="flex h-full bg-[var(--background)] text-[var(--text)] select-none text-xs relative overflow-hidden">
      {/* Sidebar navigation */}
      <div className="w-[180px] border-r border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-col gap-1.5 shrink-0">
        
        {/* Compose Button */}
        <button
          onClick={() => setIsComposing(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>

        {/* Folders */}
        <button
          onClick={() => { setFolder("inbox"); setSelectedThreadId(null); setSearchQuery(""); }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
            folder === "inbox" && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbox</span>
          </div>
          {unreadCount > 0 && (
            <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{unreadCount}</span>
          )}
        </button>

        <button
          onClick={() => { setFolder("sent"); setSelectedThreadId(null); setSearchQuery(""); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
            folder === "sent" && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Sent</span>
        </button>

        <button
          onClick={() => { setFolder("drafts"); setSelectedThreadId(null); setSearchQuery(""); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
            folder === "drafts" && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Drafts</span>
        </button>

        <div className="border-t border-[var(--border)] my-2 pt-2.5">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] px-3 mb-2">Labels</h4>
          <div className="space-y-1">
            {["Work", "Leviathan", "Security"].map(lbl => (
              <button
                key={lbl}
                onClick={() => setSearchQuery(lbl)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30 text-left truncate"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                <span className="truncate">{lbl}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Mail client panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
        {/* Top Search bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5 gap-4 bg-[var(--surface)]/10 shrink-0">
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 rounded-xl flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[var(--text)] outline-none w-full text-xs placeholder-[var(--muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="hover:text-rose-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <button 
            onClick={loadThreads} 
            className="p-2 rounded-lg hover:bg-[var(--border)]/50 text-[var(--muted)] hover:text-[var(--text)] transition"
            title="Refresh threads"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content body split pane */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Thread List Pane */}
          <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto ${selectedThreadId ? "border-r border-[var(--border)] hidden md:flex max-w-sm" : ""}`}>
            {threads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] gap-2">
                <FolderOpen className="w-8 h-8 text-[var(--border)]" />
                <span>No conversations found in this folder.</span>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]/60">
                {threads.map((thread, idx) => {
                  const isFocused = idx === keyboardIndex;
                  const isThreadSelected = thread.id === selectedThreadId;
                  const lastMsg = thread.messages[thread.messages.length - 1];
                  
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`relative flex flex-col gap-1 p-3 cursor-default transition-all ${
                        isThreadSelected
                          ? "bg-violet-500/10 border-l-2 border-violet-500"
                          : isFocused
                          ? "bg-[var(--border)]/75 border-l-2 border-[var(--muted)]"
                          : "hover:bg-[var(--surface)]/20"
                      } ${!thread.isRead ? "font-semibold text-zinc-100" : "text-[var(--muted)]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <button
                            onClick={(e) => handleToggleStar(e, thread.id)}
                            className="text-[var(--muted)] hover:text-amber-400 transition shrink-0"
                          >
                            <Star className={`w-3.5 h-3.5 ${thread.isStarred ? "text-amber-400 fill-amber-400" : ""}`} />
                          </button>
                          <span className="truncate max-w-[150px]">{lastMsg?.from.split(" <")[0]}</span>
                        </div>
                        <span className="text-[10px] font-normal text-[var(--muted)] shrink-0">
                          {new Date(thread.lastMessageTimestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      
                      <div className="font-semibold text-zinc-200 truncate pr-4">{thread.subject}</div>
                      <p className="text-[11px] text-[var(--muted)] font-normal truncate line-clamp-1">{lastMsg?.body}</p>
                      
                      <div className="absolute right-3 bottom-3 flex gap-2 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteThread(e, thread.id)}
                          className="p-1 rounded bg-[var(--border)] hover:bg-rose-600 hover:text-white transition shrink-0"
                          title="Delete thread"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reading / Detail Thread Pane */}
          {selectedThreadId && selectedThread ? (
            <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)] overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">{selectedThread.subject}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    {selectedThread.labels.map(lbl => (
                      <span key={lbl} className="bg-violet-500/15 border border-violet-500/30 text-[10px] text-violet-400 font-semibold px-2 py-0.5 rounded-full">
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => MailService.toggleStar(selectedThread.id).then(() => loadThreads())}
                    className="p-2 rounded-lg hover:bg-[var(--border)]/50"
                  >
                    <Star className={`w-4 h-4 ${selectedThread.isStarred ? "text-amber-400 fill-amber-400" : "text-[var(--muted)]"}`} />
                  </button>
                  <button
                    onClick={() => {
                      MailService.deleteThread(selectedThread.id).then(() => {
                        setSelectedThreadId(null);
                        loadThreads();
                      });
                    }}
                    className="p-2 rounded-lg hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-400"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedThreadId(null)}
                    className="p-2 rounded-lg hover:bg-[var(--border)]/50"
                    title="Close detail view"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message List in Thread */}
              <div className="space-y-4 select-text">
                {selectedThread.messages.map((msg) => (
                  <div key={msg.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] text-[var(--muted)]">
                      <div>
                        <span className="font-semibold text-zinc-200 text-xs">{msg.from}</span>
                      </div>
                      <span>{new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-xs font-mono">{msg.body}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : !selectedThreadId && threads.length > 0 ? (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-[var(--muted)] gap-2 bg-[var(--surface)]/5">
              <MailOpen className="w-10 h-10 text-[var(--border)]" />
              <span>Select a message to view its thread detail.</span>
            </div>
          ) : null}

        </div>
      </div>

      {/* Gmail Style Compose Dialog Overlay Box */}
      {isComposing && (
        <form 
          onSubmit={handleComposeSubmit} 
          className="absolute bottom-4 right-4 w-96 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 animate-window-open border-violet-500/35"
        >
          {/* Header */}
          <div className="bg-zinc-950 px-4 py-3 flex justify-between items-center text-xs font-bold text-zinc-100 border-b border-[var(--border)]">
            <span>New Message</span>
            <button 
              type="button" 
              onClick={() => setIsComposing(false)}
              className="hover:text-rose-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Inputs */}
          <div className="p-3.5 space-y-3">
            <div>
              <input
                type="email"
                placeholder="To"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                required
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 outline-none text-xs text-[var(--text)] placeholder-[var(--muted)]"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 outline-none text-xs text-[var(--text)] placeholder-[var(--muted)]"
              />
            </div>
            <div>
              <textarea
                placeholder="Write your email here..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={8}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 outline-none text-xs text-[var(--text)] placeholder-[var(--muted)] resize-none font-mono"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="bg-[var(--border)]/20 border-t border-[var(--border)] px-4 py-3 flex justify-between items-center">
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-5 py-2 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="text-[var(--muted)] hover:text-rose-400 font-semibold"
            >
              Discard
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
