// src/apps/telegram/TelegramWindow.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { telegramService, TelegramMessage } from '@/core/services/TelegramService';

interface InboxMessage {
  msg_id: number;
  sender: string;
  text: string;
  created_at: string;
}

interface Contact {
  sender: string;
  messages: InboxMessage[];
  lastMessage: InboxMessage;
}

export function TelegramWindow() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'ghost'>('inbox');
  const [ghostVault, setGhostVault] = useState<TelegramMessage[]>([]);

  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [selectedSender, setSelectedSender] = useState<string | null>(null);

  const loadInbox = async () => {
    try {
      const res = await fetch('/api/connectors/telegram/cache?limit=500');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setInboxError(body.error || 'Failed to load inbox.');
        return;
      }
      const data = await res.json();
      setInbox(data.messages || []);
      setInboxError(null);
    } catch {
      setInboxError('Could not reach the server.');
    } finally {
      setLoadingInbox(false);
    }
  };

  useEffect(() => {
    // 1. Load stored ghost vault + the real, permanent inbox on mount
    setGhostVault(telegramService.getGhostVaultMessages());
    loadInbox();

    // 2. Start daemon background polling (staging-table -> ghost vault only;
    //    the Inbox tab reads the permanent telegram_messages table instead)
    telegramService.startService();

    // 3. Refresh the inbox periodically and whenever a new ghost-vault
    //    event comes in, since a new incoming DM also lands in the
    //    permanent table around the same time.
    const unsubscribe = telegramService.subscribe((newMsg) => {
      if (newMsg.type !== 'TG_DMS') {
        setGhostVault(telegramService.getGhostVaultMessages());
      }
      loadInbox();
    });

    const interval = setInterval(loadInbox, 20000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      if (telegramService.listenerCount() === 0) {
        telegramService.stopService();
      }
    };
  }, []);

  const contacts: Contact[] = useMemo(() => {
    const bySender = new Map<string, InboxMessage[]>();
    for (const msg of inbox) {
      const list = bySender.get(msg.sender) || [];
      list.push(msg);
      bySender.set(msg.sender, list);
    }
    return Array.from(bySender.entries())
      .map(([sender, messages]) => {
        const sorted = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return { sender, messages: sorted, lastMessage: sorted[sorted.length - 1] };
      })
      .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
  }, [inbox]);

  useEffect(() => {
    if (!selectedSender && contacts.length > 0) {
      setSelectedSender(contacts[0].sender);
    }
  }, [contacts, selectedSender]);

  const activeContact = contacts.find((c) => c.sender === selectedSender);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full text-[var(--text)]" style={{ background: 'var(--background)' }}>
      {/* Header Tabs */}
      <div className="flex border-b border-[var(--border)] p-2 gap-2 shrink-0" style={{ background: 'var(--surface)' }}>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'inbox' ? 'bg-[var(--accent)] text-white' : 'opacity-70 hover:opacity-100'
          }`}
        >
          Inbox {inbox.length > 0 && `(${contacts.length})`}
        </button>
        <button
          onClick={() => setActiveTab('ghost')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'ghost' ? 'bg-purple-600 text-white' : 'opacity-70 hover:opacity-100'
          }`}
        >
          Ghost Vault ({ghostVault.length})
        </button>
      </div>

      {activeTab === 'inbox' ? (
        loadingInbox ? (
          <div className="flex-1 flex items-center justify-center text-xs opacity-60">Loading inbox…</div>
        ) : inboxError ? (
          <div className="flex-1 flex items-center justify-center text-xs text-red-400 text-center px-6">{inboxError}</div>
        ) : contacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs opacity-60 text-center px-6">
            No messages yet. Once your Telegram bot forwards a DM, it'll show up here permanently — this list survives
            reloads and works from any device.
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Contact list */}
            <div className="w-56 shrink-0 border-r border-[var(--border)] overflow-y-auto">
              {contacts.map((c) => (
                <button
                  key={c.sender}
                  onClick={() => setSelectedSender(c.sender)}
                  className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)]/50 transition cursor-pointer ${
                    selectedSender === c.sender ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]/60'
                  }`}
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-xs font-semibold truncate">@{c.sender}</span>
                    <span className="text-[10px] opacity-50 shrink-0">{formatTime(c.lastMessage.created_at)}</span>
                  </div>
                  <div className="text-[11px] opacity-60 truncate mt-0.5">{c.lastMessage.text}</div>
                </button>
              ))}
            </div>

            {/* Thread */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeContact ? (
                <>
                  <div className="px-4 py-2.5 border-b border-[var(--border)] text-xs font-semibold shrink-0">
                    @{activeContact.sender}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {activeContact.messages.map((msg) => (
                      <div key={msg.msg_id} className="max-w-[80%] rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--surface)' }}>
                        <div>{msg.text}</div>
                        <div className="text-[10px] opacity-50 mt-1">{formatTime(msg.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs opacity-60">Select a conversation</div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {ghostVault.length === 0 ? (
            <div className="text-center opacity-60 text-xs mt-10">
              Ghost Vault is empty. No deleted or edited messages intercepted yet.
            </div>
          ) : (
            ghostVault.map((msg, idx) => (
              <div
                key={idx}
                className="bg-purple-950/30 p-3 rounded-xl border border-purple-800/40 text-purple-200"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-purple-400">@{msg.sender}</span>
                  <span className="text-[10px] bg-purple-900/60 px-2 py-0.5 rounded text-purple-300">
                    {msg.type}
                  </span>
                </div>
                <div className="text-sm font-mono bg-black/20 p-2 rounded mt-1">{msg.payload}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default TelegramWindow;
