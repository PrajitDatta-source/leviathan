// src/apps/telegram/TelegramWindow.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { telegramService, TelegramMessage } from '@/core/services/TelegramService';

export function TelegramWindow() {
  const [activeTab, setActiveTab] = useState<'mirror' | 'ghost'>('mirror');
  const [liveMessages, setLiveMessages] = useState<TelegramMessage[]>([]);
  const [ghostVault, setGhostVault] = useState<TelegramMessage[]>([]);

  useEffect(() => {
    // 1. Load stored ghost vault on mount
    setGhostVault(telegramService.getGhostVaultMessages());

    // 2. Start daemon background polling
    telegramService.startService();

    // 3. Subscribe to real-time stream
    const unsubscribe = telegramService.subscribe((newMsg) => {
      if (newMsg.type === 'TG_DMS') {
        // Keep live chats strictly in RAM (clears on refresh)
        setLiveMessages((prev) => [newMsg, ...prev]);
      } else {
        // Update live Ghost Vault view
        setGhostVault(telegramService.getGhostVaultMessages());
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans">
      {/* Header Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 p-2 gap-2">
        <button
          onClick={() => setActiveTab('mirror')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'mirror' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Live Mirror (RAM Only)
        </button>
        <button
          onClick={() => setActiveTab('ghost')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'ghost' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Ghost Vault ({ghostVault.length})
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {activeTab === 'mirror' ? (
          liveMessages.length === 0 ? (
            <div className="text-center text-slate-500 text-xs mt-10">
              No live DMs received in this session yet.
            </div>
          ) : (
            liveMessages.map((msg, idx) => (
              <div key={idx} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                <div className="text-xs text-blue-400 font-medium mb-1">@{msg.sender}</div>
                <div className="text-sm">{msg.payload}</div>
              </div>
            ))
          )
        ) : (
          ghostVault.length === 0 ? (
            <div className="text-center text-slate-500 text-xs mt-10">
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
          )
        )}
      </div>
    </div>
  );
}

export default TelegramWindow;
