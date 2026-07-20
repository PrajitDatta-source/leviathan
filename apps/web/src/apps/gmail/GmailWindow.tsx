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
  MailOpen, 
  RefreshCw, 
  FolderOpen, 
  X,
  AlertCircle
} from "lucide-react";
import { MailService, MailThread } from "@/core/services/MailService";

export function GmailWindow() {
  const [activeTab, setActiveTab] = useState<string>("inbox");
  const [userLabels, setUserLabels] = useState<string[]>([]);
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
      list = await MailService.getEmails(activeTab);
    }
    setThreads(list);
    setKeyboardIndex(-1);

    const labels = await MailService.getUserLabels();
    setUserLabels(labels);
  };

  useEffect(() => {
    loadThreads();
  }, [activeTab, searchQuery]);

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

  // Helper to count unread messages in activeTab (if it maps to inbox)
  const inboxThreads = threads.filter(t => t.messages.some(m => m.folder === "inbox"));
  const unreadCount = inboxThreads.filter(t => !t.isRead).length;

  return (
    <div ref={containerRef} className="flex h-full w-full bg-[var(--background)] text-[var(--text)] select-none text-xs relative overflow-hidden">
      
      {/* Pane 1: Left Sidebar navigation */}
      <div className="w-[180px] border-r border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-col gap-1.5 shrink-0 h-full">
        {/* Compose Button */}
        <button
          onClick={() => setIsComposing(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>

        {/* Folders */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => { setActiveTab("inbox"); setSelectedThreadId(null); setSearchQuery(""); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "inbox" && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-3.5 h-3.5" />
              <span>Inbox</span>
            </div>
            {unreadCount > 0 && activeTab === "inbox" && (
              <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{unreadCount}</span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab("sent"); setSelectedThreadId(null); setSearchQuery(""); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "sent" && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Sent</span>
          </button>

          <button
            onClick={() => { setActiveTab("drafts"); setSelectedThreadId(null); setSearchQuery(""); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "drafts" && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Drafts</span>
          </button>

          <button
            onClick={() => { setActiveTab("spam"); setSelectedThreadId(null); setSearchQuery(""); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer ${
              activeTab === "spam" && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Spam</span>
          </button>
        </div>

        {/* User Labels Section */}
        {userLabels.length > 0 && (
          <div className="border-t border-[var(--border)] mt-3 pt-3 flex-1 overflow-y-auto">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] px-3 mb-2">Labels</h4>
            <div className="space-y-0.5">
              {userLabels.map(lbl => (
                <button
                  key={lbl}
                  onClick={() => { setActiveTab(lbl); setSelectedThreadId(null); setSearchQuery(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl transition cursor-pointer text-left truncate ${
                    activeTab === lbl && !searchQuery ? "bg-[var(--border)] font-semibold text-zinc-100" : "hover:bg-[var(--border)]/40 text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                  <span className="truncate">{lbl}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column Layout containing Toolbar, List, and Detail */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)] h-full overflow-hidden">
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

        {/* Panes Split View */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Pane 2: Middle Pane - Email Thread List */}
          <div className={`w-80 border-r border-[var(--border)] flex flex-col min-w-0 h-full overflow-y-auto shrink-0 bg-[var(--surface)]/5 ${selectedThreadId ? "hidden md:flex" : "flex"}`}>
            {threads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] gap-2">
                <FolderOpen className="w-8 h-8 text-[var(--border)]" />
                <span>No conversations found.</span>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]/40">
                {threads.map((thread, idx) => {
                  const isFocused = idx === keyboardIndex;
                  const isThreadSelected = thread.id === selectedThreadId;
                  const lastMsg = thread.messages[thread.messages.length - 1];
                  
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`relative flex flex-col gap-1.5 p-3.5 cursor-pointer transition-all ${
                        isThreadSelected
                          ? "bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]"
                          : isFocused
                          ? "bg-[var(--border)]/75 border-l-2 border-[var(--muted)]"
                          : "hover:bg-[var(--surface)]/20"
                      } ${!thread.isRead ? "font-semibold text-zinc-100" : "text-[var(--muted)]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <button
                            onClick={(e) => handleToggleStar(e, thread.id)}
                            className="text-[var(--muted)] hover:text-amber-400 transition shrink-0 animate-window-open"
                          >
                            <Star className={`w-3.5 h-3.5 ${thread.isStarred ? "text-amber-400 fill-amber-400" : ""}`} />
                          </button>
                          <span className="truncate max-w-[120px] text-xs">{lastMsg?.from.split(" <")[0]}</span>
                        </div>
                        <span className="text-[9px] font-normal text-[var(--muted)] shrink-0">
                          {new Date(thread.lastMessageTimestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-zinc-200 truncate pr-4 text-xs font-medium">
                          {thread.subject}
                        </div>
                        {!thread.isRead && (
                          <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-[10px] text-[var(--muted)] font-normal truncate line-clamp-1">
                        {lastMsg?.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pane 3: Right Pane - Scrollable Email Detail View */}
          <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)] h-full overflow-hidden">
            {selectedThreadId && selectedThread ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Thread Toolbar */}
                <div className="flex items-center justify-between border-b border-[var(--border)] p-4 bg-[var(--surface)]/5 shrink-0">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-100">{selectedThread.subject}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {selectedThread.labels.map(lbl => (
                        <span key={lbl} className="bg-[var(--accent)]/15 border border-[var(--accent)]/35 text-[9px] text-[var(--accent)] font-semibold px-2 py-0.5 rounded-full">
                          {lbl}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => MailService.toggleStar(selectedThread.id).then(() => loadThreads())}
                      className="p-2 rounded-lg hover:bg-[var(--border)]/50"
                      title="Star conversation"
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

                {/* Email Messages Thread view - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
                  {selectedThread.messages.map((msg) => (
                    <div key={msg.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] text-[var(--muted)] border-b border-[var(--border)]/50 pb-2">
                        <span className="font-semibold text-zinc-200 text-xs">{msg.from}</span>
                        <span>{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-xs font-mono">
                        {msg.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] gap-2 bg-[var(--surface)]/5">
                <MailOpen className="w-10 h-10 text-[var(--border)]" />
                <span>Select an email thread to read.</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Pop-up Compose dialog */}
      {isComposing && (
        <form 
          onSubmit={handleComposeSubmit} 
          className="absolute bottom-4 right-4 w-96 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 animate-window-open border-[var(--accent)]/35"
        >
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

          <div className="bg-[var(--border)]/20 border-t border-[var(--border)] px-4 py-3 flex justify-between items-center">
            <button
              type="submit"
              className="bg-[var(--accent)] hover:opacity-90 text-white font-bold px-5 py-2 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer border-none"
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
