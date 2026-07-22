'use client';

import React, { useState, useEffect } from 'react';
import { autoSyncToCloud } from '@/lib/vault';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isDeleted?: boolean;
}

interface Chat {
  id: string;
  name: string;
  messages: Message[];
}

interface GhostItem {
  path: string;
  sender: string;
  text: string;
  interceptedAt: number;
  chatId: string;
}

export function TelegramWindow() {
  const [activeTab, setActiveTab] = useState<'chats' | 'ghost'>('chats');
  const [chats, setChats] = useState<Record<string, Chat>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [ghostVault, setGhostVault] = useState<Record<string, GhostItem>>({});

  const chatsRef = React.useRef(chats);
  const ghostVaultRef = React.useRef(ghostVault);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    ghostVaultRef.current = ghostVault;
  }, [ghostVault]);

  // 1. Hydrate from local VFS / Vault state on boot
  useEffect(() => {
    const rawVFS = localStorage.getItem('iris_vfs_data');
    if (rawVFS) {
      try {
        const vfs = JSON.parse(rawVFS);
        if (vfs.telegramData?.chats && Object.keys(vfs.telegramData.chats).length > 0) {
          setChats(vfs.telegramData.chats);
          setActiveChatId((prev) => prev || Object.keys(vfs.telegramData.chats)[0]);
        } else {
          const defaultChats: Record<string, Chat> = {
            tg_bot: {
              id: 'tg_bot',
              name: 'Telegram Bot',
              messages: [
                { id: 'm1', sender: 'Telegram Bot', text: 'Welcome to Iris OS Telegram Connector!', timestamp: Date.now() }
              ]
            }
          };
          setChats(defaultChats);
          setActiveChatId((prev) => prev || 'tg_bot');
        }
        if (vfs.telegramData?.ghostVault) setGhostVault(vfs.telegramData.ghostVault);
      } catch (e) {
        console.error('Failed to load Telegram local state', e);
      }
    } else {
      const defaultChats: Record<string, Chat> = {
        tg_bot: {
          id: 'tg_bot',
          name: 'Telegram Bot',
          messages: [
            { id: 'm1', sender: 'Telegram Bot', text: 'Welcome to Iris OS Telegram Connector!', timestamp: Date.now() }
          ]
        }
      };
      setChats(defaultChats);
      setActiveChatId('tg_bot');
    }
  }, []);

  // Listen for background updates
  useEffect(() => {
    const handleRemoteUpdate = () => {
      const rawVFS = localStorage.getItem('iris_vfs_data');
      if (rawVFS) {
        try {
          const vfs = JSON.parse(rawVFS);
          if (vfs.telegramData?.chats) setChats(vfs.telegramData.chats);
          if (vfs.telegramData?.ghostVault) setGhostVault(vfs.telegramData.ghostVault);
        } catch (e) {}
      }
    };

    window.addEventListener('vfs-updated', handleRemoteUpdate);
    window.addEventListener('vfs-synced', handleRemoteUpdate);
    return () => {
      window.removeEventListener('vfs-updated', handleRemoteUpdate);
      window.removeEventListener('vfs-synced', handleRemoteUpdate);
    };
  }, []);

  // 2. Poll /api/connectors/telegram every 3 seconds for incoming staged messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/connectors/telegram');
        if (!res.ok) return;
        const data = await res.json();

        if (data.messages && data.messages.length > 0) {
          console.log('Fetched incoming Telegram messages:', data.messages);

          const rawVFS = localStorage.getItem('iris_vfs_data');
          let currentChats: Record<string, Chat> = {};
          let currentGhost: Record<string, GhostItem> = {};

          if (rawVFS) {
            try {
              const parsed = JSON.parse(rawVFS);
              if (parsed.telegramData?.chats) currentChats = parsed.telegramData.chats;
              if (parsed.telegramData?.ghostVault) currentGhost = parsed.telegramData.ghostVault;
            } catch (e) {}
          }

          if (Object.keys(currentChats).length === 0) currentChats = chatsRef.current;
          if (Object.keys(currentGhost).length === 0) currentGhost = ghostVaultRef.current;

          let updatedChats = { ...currentChats };
          let updatedGhost = { ...currentGhost };

          data.messages.forEach((msg: any) => {
            const isGhostIntercept =
              msg.type &&
              (msg.type.toUpperCase().includes('DELETE') || msg.type.toUpperCase().includes('UNSENT'));

            if (isGhostIntercept) {
              const ghostKey = `ghost_${msg.id}_${Date.now()}`;
              updatedGhost[ghostKey] = {
                path: ghostKey,
                sender: msg.sender || 'Unknown Intercept',
                text: msg.payload || '',
                interceptedAt: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
                chatId: msg.sender ? msg.sender.toLowerCase().replace(/\s+/g, '_') : 'user_ghost'
              };
            } else {
              const chatId = msg.sender ? msg.sender.toLowerCase().replace(/\s+/g, '_') : 'tg_bot';
              const chatName = msg.sender || 'Telegram Bot';

              const chat = updatedChats[chatId] || {
                id: chatId,
                name: chatName,
                messages: []
              };

              const newMsg: Message = {
                id: `tg_${msg.id}_${Date.now()}`,
                sender: msg.sender || 'Telegram Bot',
                text: msg.payload || '',
                timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
              };

              updatedChats = {
                ...updatedChats,
                [chatId]: {
                  ...chat,
                  messages: [...chat.messages, newMsg]
                }
              };
            }
          });

          persistTelegramState(updatedChats, updatedGhost);
        }
      } catch (e) {
        console.error('Failed to poll Telegram inbox:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);


  // 2. Save and Sync helper
  const persistTelegramState = (newChats: Record<string, Chat>, newGhost: Record<string, GhostItem>) => {
    setChats(newChats);
    setGhostVault(newGhost);

    const rawVFS = localStorage.getItem('iris_vfs_data');
    let vfs: any = {};
    if (rawVFS) {
      try {
        vfs = JSON.parse(rawVFS);
      } catch (e) {}
    }
    
    vfs.telegramData = {
      chats: newChats,
      ghostVault: newGhost
    };

    localStorage.setItem('iris_vfs_data', JSON.stringify(vfs));
    autoSyncToCloud(); // ➔ Pushes encrypted payload to Supabase!
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeChatId) return;

    const chat = chats[activeChatId] || { id: activeChatId, name: 'Chat', messages: [] };
    const newMessage: Message = {
      id: 'm_' + Date.now(),
      sender: 'You',
      text: messageInput,
      timestamp: Date.now(),
    };

    const updatedChats = {
      ...chats,
      [activeChatId]: {
        ...chat,
        messages: [...chat.messages, newMessage]
      }
    };

    persistTelegramState(updatedChats, ghostVault);
    setMessageInput('');
  };

  // Actions for Ghost/Unsent Vault
  const handleRestoreGhostMessage = (path: string, item: GhostItem) => {
    const chatId = item.chatId || 'user_ghost';
    const chat = chats[chatId] || { id: chatId, name: item.sender || 'Intercepted Chat', messages: [] };
    const restoredMsg: Message = {
      id: 'restored_' + Date.now(),
      sender: item.sender,
      text: `[Restored Unsent]: ${item.text}`,
      timestamp: Date.now()
    };

    const updatedChats = {
      ...chats,
      [chatId]: {
        ...chat,
        messages: [...chat.messages, restoredMsg]
      }
    };

    const updatedGhost = { ...ghostVault };
    delete updatedGhost[path];

    persistTelegramState(updatedChats, updatedGhost);
  };

  const handlePermanentDeleteGhost = (path: string) => {
    const updatedGhost = { ...ghostVault };
    delete updatedGhost[path];
    persistTelegramState(chats, updatedGhost);
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden border border-slate-800 rounded-lg">
      {/* Sidebar navigation */}
      <div className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-sm tracking-wide text-cyan-400">IRIS TELEGRAM</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setActiveTab('chats')} 
              className={`px-2 py-1 text-xs rounded cursor-pointer ${activeTab === 'chats' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              Chats
            </button>
            <button 
              onClick={() => setActiveTab('ghost')} 
              className={`px-2 py-1 text-xs rounded cursor-pointer ${activeTab === 'ghost' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              title="Intercepted Deleted & Unsent Messages"
            >
              Ghost ({Object.keys(ghostVault).length})
            </button>
          </div>
        </div>

        {/* Chat List or Ghost List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chats' ? (
            Object.keys(chats).length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">No active chats yet</div>
            ) : (
              Object.values(chats).map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`p-3 cursor-pointer border-b border-slate-800/40 transition-colors ${activeChatId === chat.id ? 'bg-slate-800/80 border-l-4 border-l-cyan-400' : 'hover:bg-slate-800/30'}`}
                >
                  <div className="font-semibold text-sm">{chat.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {chat.messages[chat.messages.length - 1]?.text || 'No messages yet'}
                  </div>
                </div>
              ))
            )
          ) : (
            Object.keys(ghostVault).length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">Ghost vault empty</div>
            ) : (
              Object.entries(ghostVault).map(([path, item]) => (
                <div key={path} className="p-3 border-b border-slate-800/40 text-xs">
                  <div className="flex justify-between text-amber-400 font-semibold mb-1">
                    <span>{item.sender}</span>
                    <span className="text-[10px] text-slate-500">{new Date(item.interceptedAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 italic mb-2 bg-slate-900 p-1.5 rounded border border-slate-800 font-mono">
                    &quot;{item.text}&quot;
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRestoreGhostMessage(path, item)}
                      className="px-2 py-0.5 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 rounded border border-emerald-800 cursor-pointer"
                    >
                      Restore
                    </button>
                    <button 
                      onClick={() => handlePermanentDeleteGhost(path)}
                      className="px-2 py-0.5 bg-red-950 text-red-400 hover:bg-red-900 rounded border border-red-800 cursor-pointer"
                    >
                      Shred
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Main chat window view */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {activeChatId && chats[activeChatId] ? (
          <>
            <div className="p-3 border-b border-slate-800 font-semibold text-sm bg-slate-900/30">
              {chats[activeChatId].name}
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
              {chats[activeChatId].messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`max-w-[70%] p-2.5 rounded-lg text-xs leading-relaxed ${msg.sender === 'You' ? 'ml-auto bg-cyan-600 text-white' : 'mr-auto bg-slate-800 text-slate-200'}`}
                >
                  <div className="text-[10px] opacity-60 mb-0.5">{msg.sender}</div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900/30">
              <input 
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a secure message..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <button 
                onClick={handleSendMessage}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
            {activeTab === 'chats' ? 'Select a chat stream from the left' : 'Review intercepted phantom messages'}
          </div>
        )}
      </div>
    </div>
  );
}
