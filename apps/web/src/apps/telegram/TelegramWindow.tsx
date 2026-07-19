"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  User, 
  Users,
  Radio,
  Bookmark,
  Bot, 
  Search, 
  Paperclip, 
  File, 
  Image as ImageIcon,
  X,
  Phone,
  Video,
  MoreVertical,
  MessageSquare,
  Ghost,
  ShieldAlert,
  Flame,
  Undo2
} from "lucide-react";
import { TelegramService, TelegramChat, TelegramMessage } from "@/core/services/TelegramService";

type FilterTab = "dm" | "group" | "channel" | "saved" | "ghost";

export function TelegramWindow() {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("dm");
  const [activeChatId, setActiveChatId] = useState<string>("tg_bot");
  const [activeChat, setActiveChat] = useState<TelegramChat | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSimMenu, setShowSimMenu] = useState(false);
  
  // Attachment states
  const [attachment, setAttachment] = useState<{ name: string; url: string; type: "image" | "file" } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadChats = async () => {
    const list = await TelegramService.getChats();
    setChats(list);
  };

  useEffect(() => {
    loadChats().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeChatId) {
      TelegramService.getChatById(activeChatId).then(chat => {
        setActiveChat(chat);
        if (chat && chat.unreadCount > 0) {
          TelegramService.clearUnread(activeChatId).then(() => {
            loadChats();
          });
        }
      });
    }
  }, [activeChatId]);

  // Handle incoming message event to refresh UI
  useEffect(() => {
    const handleReceivedMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      loadChats().then(() => {
        if (detail?.chatId === activeChatId) {
          TelegramService.getChatById(activeChatId).then(chat => {
            setActiveChat(chat);
          });
        }
      });
    };

    window.addEventListener("telegram-message-received", handleReceivedMessage);
    return () => window.removeEventListener("telegram-message-received", handleReceivedMessage);
  }, [activeChatId]);

  // Jitter-free scrolling to bottom of message thread
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachment) return;

    const textToSend = input.trim();
    setInput("");
    
    const currentAttachment = attachment;
    setAttachment(null);

    if (activeChatId) {
      await TelegramService.sendMessage(activeChatId, textToSend, currentAttachment || undefined);
      
      const updatedChat = await TelegramService.getChatById(activeChatId);
      setActiveChat(updatedChat);
      loadChats();
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const isImg = file.type.startsWith("image/");
      setAttachment({
        name: file.name,
        url,
        type: isImg ? "image" : "file"
      });
    }
  };

  // Simulate MTProto message events from remote backend
  const handleSimulateEvent = async (type: "edit" | "delete" | "unsend") => {
    if (!activeChat || activeChat.messages.length === 0) return;
    
    // Target the last message from a bot / peer (non-owner)
    const peerMsgs = activeChat.messages.filter(m => m.sender !== "You (Owner)");
    if (peerMsgs.length === 0) {
      alert("Please wait for a response or receive a bot message to simulate remote updates.");
      return;
    }
    const targetMsg = peerMsgs[peerMsgs.length - 1];

    if (type === "edit") {
      await TelegramService.handleMTProtoEvent({
        type: "MessageEdit",
        chatId: activeChat.id,
        messageId: targetMsg.id,
        newText: `[MTProto Edited] ${targetMsg.text} (edited at ${new Date().toLocaleTimeString()})`
      });
    } else if (type === "delete") {
      await TelegramService.handleMTProtoEvent({
        type: "UpdateDeleteMessages",
        chatId: activeChat.id,
        messageIds: [targetMsg.id]
      });
    } else if (type === "unsend") {
      await TelegramService.handleMTProtoEvent({
        type: "UpdateDeleteMessages",
        chatId: activeChat.id,
        messageIds: [targetMsg.id],
        isUnsent: true
      });
    }
    setShowSimMenu(false);
  };

  // Filter chats by tab
  const getFilteredChats = () => {
    let list = chats;
    if (activeTab === "ghost") {
      // Ghost tab shows chats that contain deleted or unsent messages
      list = chats.filter(c => c.messages.some(m => m.isDeleted || m.isUnsent));
    } else {
      list = chats.filter(c => c.type === activeTab);
    }

    return list.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredChats = getFilteredChats();

  return (
    <div className="flex h-full w-full bg-[var(--background)] text-[var(--text)] select-none text-xs overflow-hidden">
      
      {/* Pane 1: Sidebar with Filters and Chat List */}
      <div className="w-[220px] border-r border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0 h-full">
        {/* Search */}
        <div className="p-3 border-b border-[var(--border)] shrink-0 flex items-center gap-2 bg-[var(--background)]/20">
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 rounded-xl w-full">
            <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[var(--text)] outline-none w-full placeholder-[var(--muted)] text-[10px]"
            />
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-around border-b border-[var(--border)] p-1 bg-zinc-950/20 shrink-0">
          <button
            onClick={() => setActiveTab("dm")}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTab === "dm" ? "bg-violet-600/15 text-violet-400" : "text-[var(--muted)] hover:text-zinc-300"}`}
            title="DMs"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTab === "group" ? "bg-violet-600/15 text-violet-400" : "text-[var(--muted)] hover:text-zinc-300"}`}
            title="Groups"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("channel")}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTab === "channel" ? "bg-violet-600/15 text-violet-400" : "text-[var(--muted)] hover:text-zinc-300"}`}
            title="Channels"
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTab === "saved" ? "bg-violet-600/15 text-violet-400" : "text-[var(--muted)] hover:text-zinc-300"}`}
            title="Saved Messages"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("ghost")}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative ${activeTab === "ghost" ? "bg-red-500/15 text-red-400 font-bold" : "text-zinc-500 hover:text-red-300"}`}
            title="Ghost / Deleted Messages"
          >
            <Ghost className="w-4 h-4" />
            {chats.some(c => c.messages.some(m => (m.isDeleted || m.isUnsent) && c.unreadCount > 0)) && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Chats List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {loading ? (
            <div className="text-center py-8 text-[var(--muted)] animate-pulse">Loading...</div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)] select-none">
              {activeTab === "ghost" ? "No ghost/deleted events captured." : "No chats in this folder."}
            </div>
          ) : filteredChats.map((c) => {
            const isActive = c.id === activeChatId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveChatId(c.id)}
                className={`flex items-center gap-2.5 p-2 rounded-xl transition cursor-pointer border border-transparent ${
                  isActive 
                    ? "bg-violet-500/10 border-violet-500/20 text-zinc-100 font-semibold" 
                    : "hover:bg-[var(--border)]/45 text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0 ${
                  c.id === "tg_bot" ? "bg-violet-600" : c.id === "saved_msgs" ? "bg-indigo-600" : "bg-zinc-700"
                }`}>
                  {c.avatar}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-zinc-200 truncate max-w-[100px]">{c.name}</span>
                    <span className="text-[9px] text-[var(--muted)] font-normal">
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--muted)] font-normal truncate">{c.lastMessage}</p>
                </div>

                {c.unreadCount > 0 && (
                  <span className="bg-violet-600 text-white rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center shrink-0">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pane 2: Main Chat conversation Pane */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)] h-full overflow-hidden relative">
          
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-[var(--surface)]/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${activeChat.isOnline ? "bg-emerald-500" : "bg-zinc-500"}`} />
              <div>
                <span className="font-semibold text-zinc-200 text-sm leading-tight">{activeChat.name}</span>
                <span className="text-[9px] text-[var(--muted)] block mt-0.5">
                  {activeTab === "ghost" ? "Ghost / Decoupled Tab" : (activeChat.isOnline ? "online" : "offline")}
                </span>
              </div>
            </div>

            {/* Simulated Event triggers and utility buttons */}
            <div className="flex items-center gap-2 text-[var(--muted)] relative">
              <button 
                onClick={() => setShowSimMenu(!showSimMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600/10 border border-violet-500/25 hover:bg-violet-600/20 text-violet-400 font-bold rounded-xl transition cursor-pointer"
                title="Simulate MTProto Event"
              >
                <Flame className="w-3.5 h-3.5 text-violet-400" />
                <span>Simulate Event</span>
              </button>

              {showSimMenu && (
                <div className="absolute right-0 top-9 bg-zinc-950 border border-[var(--border)] rounded-2xl shadow-2xl p-1.5 w-48 text-[11px] z-50 animate-window-open">
                  <button
                    onClick={() => handleSimulateEvent("edit")}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-[var(--border)] text-zinc-200 hover:text-white transition"
                  >
                    📝 Simulate Message Edit
                  </button>
                  <button
                    onClick={() => handleSimulateEvent("delete")}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition mt-0.5"
                  >
                    👻 Simulate Message Delete
                  </button>
                  <button
                    onClick={() => handleSimulateEvent("unsend")}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-orange-500/10 text-orange-400 hover:text-orange-300 transition mt-0.5"
                  >
                    ↩️ Simulate Message Recall
                  </button>
                </div>
              )}

              <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />

              <button className="p-1.5 rounded-lg hover:bg-[var(--border)]/50 transition">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-[var(--border)]/50 transition">
                <Video className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages scroll pane */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
            {activeChat.messages
              .filter(msg => {
                // If in ghost/deleted view, show all messages. Otherwise, filter out deleted/unsent ones
                if (activeTab === "ghost") return true;
                return !msg.isDeleted && !msg.isUnsent;
              })
              .map((msg) => {
                const isMe = msg.sender === "You (Owner)";
                
                // Styling based on message flags
                let bgStyle = isMe 
                  ? "bg-violet-600 border-violet-500 text-white rounded-tr-none" 
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] rounded-tl-none";
                let badge = null;

                if (msg.isDeleted) {
                  bgStyle = "bg-red-500/10 border-red-500/30 text-red-300 rounded-tl-none";
                  badge = (
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-red-400 uppercase tracking-wider mb-1 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/25">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Ghost/Deleted
                    </span>
                  );
                } else if (msg.isUnsent) {
                  bgStyle = "bg-orange-500/10 border-orange-500/30 text-orange-300 rounded-tl-none";
                  badge = (
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-orange-400 uppercase tracking-wider mb-1 bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/25">
                      <Undo2 className="w-2.5 h-2.5" />
                      Recalled/Unsent
                    </span>
                  );
                }

                return (
                  <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""} animate-window-open`}>
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] ${
                      isMe ? "bg-zinc-700" : "bg-violet-600"
                    }`}>
                      {msg.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className={`rounded-2xl px-4 py-2.5 shadow-sm text-xs border flex flex-col ${bgStyle}`}>
                        {badge}
                        
                        {/* Attachment Render */}
                        {msg.attachmentUrl && (
                          <div className="mb-2 p-2 bg-black/20 rounded-xl border border-white/5 flex items-center gap-2">
                            {msg.attachmentType === "image" ? (
                              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                                <img src={msg.attachmentUrl} alt="attachment" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <>
                                <File className="w-5 h-5 text-violet-300" />
                                <span className="font-semibold truncate max-w-[120px] text-[10px]">{msg.attachmentName}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Text Content */}
                        <p className="leading-relaxed font-mono whitespace-pre-wrap">{msg.text}</p>

                        {/* Edited Original Text view */}
                        {msg.isEdited && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 text-[9px] text-[var(--muted)] italic">
                            <span>Edited (Original: "{msg.originalText}")</span>
                          </div>
                        )}
                      </div>

                      <div className={`text-[9px] text-[var(--muted)] px-1 flex items-center gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {msg.isEdited && <span className="text-[8px] bg-[var(--border)] px-1 rounded">edited</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Sticky Input Bar at Bottom */}
          <div className="border-t border-[var(--border)] p-3 bg-[var(--surface)]/25 shrink-0 flex flex-col gap-2 w-full mt-auto">
            {attachment && (
              <div className="flex items-center justify-between p-2 bg-[var(--border)]/20 border border-[var(--border)] rounded-xl max-w-sm">
                <div className="flex items-center gap-2">
                  {attachment.type === "image" ? <ImageIcon className="w-4 h-4 text-violet-400" /> : <File className="w-4 h-4 text-violet-400" />}
                  <span className="truncate max-w-[150px] font-semibold text-[10px]">{attachment.name}</span>
                </div>
                <button onClick={() => setAttachment(null)} className="text-zinc-400 hover:text-rose-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleAttachmentChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-[var(--border)]/65 hover:bg-[var(--border)] hover:scale-105 text-[var(--muted)] hover:text-[var(--text)] transition flex items-center justify-center shrink-0 cursor-pointer"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs text-[var(--text)] outline-none placeholder-[var(--muted)]"
              />

              <button
                type="submit"
                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 hover:scale-105 text-white transition flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
          
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] gap-2 bg-[var(--surface)]/5">
          <MessageSquare className="w-10 h-10 text-[var(--border)]" />
          <span>Select a chat to begin secure communication.</span>
        </div>
      )}
    </div>
  );
}
