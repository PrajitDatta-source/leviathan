"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, User, Bot, AlertCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export function TelegramWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const res = await fetch("/api/connectors/telegram");
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (e) {
      console.error("Failed to load Telegram chats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");

    // optimistic client update
    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      sender: "You (Owner)",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch("/api/connectors/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "You (Owner)", text }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (e) {
      console.error("Telegram send failed:", e);
      // refetch to sync correctly
      loadMessages();
    }
  };

  return (
    <div className="flex h-full bg-[var(--background)] text-[var(--text)] select-none">
      {/* Chats Sidebar */}
      <div className="w-[180px] border-r border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-2.5 shrink-0 text-xs">
        <h2 className="font-bold text-[var(--muted)] px-2 mb-1 uppercase tracking-wider">Conversations</h2>
        
        <div className="flex items-center gap-2.5 p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg font-semibold text-zinc-100">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px]">
            TB
          </div>
          <div className="truncate">
            <div>Telegram Bot</div>
            <div className="text-[9px] text-emerald-400 font-normal mt-0.5">Online</div>
          </div>
        </div>
      </div>

      {/* Main Messaging Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface)]/20 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-sm">Telegram Bot Direct Message</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--muted)] animate-pulse">
              Syncing with secure Telegram API nodes...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
              No messages exchanged yet.
            </div>
          ) : (
            messages.map((msg) => {
              const isBot = msg.sender === "Telegram Bot";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[80%] ${isBot ? "" : "ml-auto flex-row-reverse"}`}
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white ${
                    isBot ? "bg-violet-600" : "bg-zinc-700"
                  }`}>
                    {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  
                  <div>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                      isBot 
                        ? "bg-[var(--surface)] text-[var(--text)] rounded-tl-none border border-[var(--border)]" 
                        : "bg-violet-600 text-white rounded-tr-none"
                    }`}>
                      {msg.text}
                    </div>
                    <div className={`text-[9px] text-[var(--muted)] mt-1 px-1 ${isBot ? "" : "text-right"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="border-t border-[var(--border)] p-3 bg-[var(--surface)]/20 shrink-0 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs text-[var(--text)] outline-none placeholder-[var(--muted)]"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
