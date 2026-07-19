"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  User, 
  Bot, 
  Search, 
  Paperclip, 
  File, 
  Image as ImageIcon,
  X,
  Smile,
  Phone,
  Video,
  MoreVertical,
  MessageSquare
} from "lucide-react";
import { TelegramService, TelegramChat, TelegramMessage } from "@/core/services/TelegramService";

export function TelegramWindow() {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("tg_bot");
  const [activeChat, setActiveChat] = useState<TelegramChat | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Attachment states
  const [attachment, setAttachment] = useState<{ name: string; url: string; type: "image" | "file" } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachment) return;

    const textToSend = input.trim();
    setInput("");
    
    const currentAttachment = attachment;
    setAttachment(null);

    if (activeChatId) {
      // optimistic update
      await TelegramService.sendMessage(activeChatId, textToSend, currentAttachment || undefined);
      
      // refresh UI
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

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[var(--background)] text-[var(--text)] select-none text-xs overflow-hidden">
      {/* Sidebar: Chats List */}
      <div className="w-[200px] border-r border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0">
        
        {/* Search */}
        <div className="p-3 border-b border-[var(--border)] shrink-0 flex items-center gap-2 bg-[var(--background)]/20">
          <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 rounded-xl w-full">
            <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[var(--text)] outline-none w-full placeholder-[var(--muted)] text-[11px]"
            />
          </div>
        </div>

        {/* Chats Array */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {loading ? (
            <div className="text-center py-8 text-[var(--muted)] animate-pulse">Loading...</div>
          ) : filteredChats.map((c) => {
            const isActive = c.id === activeChatId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveChatId(c.id)}
                className={`flex items-center gap-2.5 p-2 rounded-xl transition cursor-default ${
                  isActive 
                    ? "bg-violet-500/10 border border-violet-500/20 text-zinc-100 font-semibold" 
                    : "hover:bg-[var(--border)]/45 text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0 ${
                  c.id === "tg_bot" ? "bg-violet-600" : "bg-zinc-700"
                }`}>
                  {c.avatar}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-zinc-200 truncate max-w-[90px]">{c.name}</span>
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

      {/* Main Conversation viewport pane */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-[var(--surface)]/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${activeChat.isOnline ? "bg-emerald-500" : "bg-zinc-500"}`} />
              <div>
                <span className="font-semibold text-zinc-200 text-sm leading-tight">{activeChat.name}</span>
                <span className="text-[9px] text-[var(--muted)] block mt-0.5">{activeChat.isOnline ? "online" : "offline"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[var(--muted)]">
              <button className="p-1.5 rounded-lg hover:bg-[var(--border)]/50 transition">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-[var(--border)]/50 transition">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-[var(--border)]/50 transition">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation view scrollback */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
            {activeChat.messages.map((msg) => {
              const isMe = msg.sender === "You (Owner)";
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[75%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] ${
                    isMe ? "bg-zinc-700" : "bg-violet-600"
                  }`}>
                    {msg.isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm text-xs border ${
                      isMe 
                        ? "bg-violet-600 border-violet-500 text-white rounded-tr-none" 
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] rounded-tl-none"
                    }`}>
                      
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

                      {/* Text */}
                      <p className="leading-relaxed font-mono whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    <div className={`text-[9px] text-[var(--muted)] px-1 ${isMe ? "text-right" : ""}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer Box */}
          <div className="border-t border-[var(--border)] p-3 bg-[var(--surface)]/25 shrink-0 flex flex-col gap-2">
            
            {/* Attachment preview box */}
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
