'use client';

import React, { useState, useEffect } from 'react';

interface EmailItem {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  internalDate: number;
  timePrimary: string;
  timeRelative: string;
  isUnread: boolean;
  isStarred: boolean;
  labels: string[];
}

interface LabelItem {
  id: string;
  name: string;
  type: string;
  unreadCount?: number;
  latestTimestamp?: number;
  timeRelative?: string;
  icon?: string;
}

const FOLDER_CONFIG: Record<string, { name: string; icon: string }> = {
  INBOX: { name: 'Inbox', icon: '◆' },
  STARRED: { name: 'Starred', icon: '★' },
  SENT: { name: 'Sent', icon: '↗' },
  DRAFT: { name: 'Drafts', icon: '◈' },
  SPAM: { name: 'Spam', icon: '⊘' },
  TRASH: { name: 'Bin', icon: '✕' },
};

const IGNORED_LABELS = [
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'CATEGORY_UPDATES',
  'CATEGORY_FORUMS',
  'CATEGORY_PERSONAL',
  'IMPORTANT',
  'CHAT',
  'UNREAD',
];

export function GmailWindow() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [mailboxes, setMailboxes] = useState<LabelItem[]>([]);
  const [customLabels, setCustomLabels] = useState<LabelItem[]>([]);
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});
  const [activeFolder, setActiveFolder] = useState<string>('INBOX');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState<number>(0);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('gmail_code');
    const existingToken = localStorage.getItem('iris_gmail_token');

    if (code) {
      handleTokenExchange(code);
    } else if (existingToken) {
      setIsConnected(true);
      initializeMailClient(existingToken, 'INBOX');
    }
  }, []);

  // Wipes tokens and drops user back to auth screen
  const handleDisconnect = () => {
    localStorage.removeItem('iris_gmail_token');
    localStorage.removeItem('iris_gmail_refresh_token');
    setIsConnected(false);
    setEmails([]);
    setMailboxes([]);
    setCustomLabels([]);
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('iris_gmail_refresh_token');
    const clientId = localStorage.getItem('iris_g_client_id');
    const clientSecret = localStorage.getItem('iris_g_secret');

    if (!refreshToken || !clientId || !clientSecret) return null;

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('iris_gmail_token', data.access_token);
        return data.access_token;
      }
    } catch (e) {
      console.error('Failed to auto-refresh Gmail token:', e);
    }
    return null;
  };

  const handleTokenExchange = async (code: string) => {
    setLoading(true);
    const clientId = localStorage.getItem('iris_g_client_id');
    const clientSecret = localStorage.getItem('iris_g_secret');

    if (!clientId || !clientSecret) {
      alert('Please configure your Google Client ID and Secret in Settings first!');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: 'https://irissys.vercel.app/api/auth/callback/google',
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json();

      if (data.access_token) {
        localStorage.setItem('iris_gmail_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('iris_gmail_refresh_token', data.refresh_token);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsConnected(true);
        initializeMailClient(data.access_token, 'INBOX');
      } else {
        console.error('Token Exchange Error:', data);
        alert('Authentication failed. Please check your Client ID and Secret in Settings.');
        handleDisconnect();
      }
    } catch (err) {
      console.error('Failed to exchange token:', err);
      handleDisconnect();
    } finally {
      setLoading(false);
    }
  };

  const initializeMailClient = async (token: string, folderId: string) => {
    setLoading(true);
    await fetchLabelsAndActivity(token);
    await fetchMessages(token, folderId);
    setLoading(false);
  };

  const getMinimalRelativeTime = (timestampMs?: number) => {
    if (!timestampMs || timestampMs === 0) return '';
    const diffMins = Math.floor((Date.now() - timestampMs) / (1000 * 60));
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const fetchLabelsAndActivity = async (token: string) => {
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return fetchLabelsAndActivity(newToken);
        } else {
          handleDisconnect();
          return;
        }
      }

      const data = await res.json();
      if (!data.labels) return;

      const newMap: Record<string, string> = {};
      const rawCore: LabelItem[] = [];
      const rawCustom: LabelItem[] = [];
      let inboxUnread = 0;

      data.labels.forEach((lbl: any) => {
        if (IGNORED_LABELS.includes(lbl.id)) return;

        const cleanName = FOLDER_CONFIG[lbl.id]?.name || lbl.name;
        newMap[lbl.id] = cleanName;

        if (lbl.id === 'INBOX' && lbl.messagesUnread) {
          inboxUnread = lbl.messagesUnread;
        }

        const labelObj: LabelItem = {
          id: lbl.id,
          name: cleanName,
          type: lbl.type,
          unreadCount: lbl.messagesUnread || 0,
          icon: FOLDER_CONFIG[lbl.id]?.icon || '▪',
        };

        if (FOLDER_CONFIG[lbl.id]) {
          rawCore.push(labelObj);
        } else if (lbl.type === 'user') {
          rawCustom.push(labelObj);
        }
      });

      setLabelMap(newMap);
      setUnreadInboxCount(inboxUnread);

      const enrichWithTimestamps = async (items: LabelItem[]) => {
        return Promise.all(
          items.map(async (item) => {
            try {
              const msgRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${item.id}&maxResults=1`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const msgData = await msgRes.json();

              if (msgData.messages && msgData.messages.length > 0) {
                const detailRes = await fetch(
                  `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgData.messages[0].id}?format=minimal`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                const detailData = await detailRes.json();
                const ts = parseInt(detailData.internalDate || '0', 10);
                return {
                  ...item,
                  latestTimestamp: ts,
                  timeRelative: getMinimalRelativeTime(ts),
                };
              }
            } catch (e) {
              console.error(`Failed to sync timestamp for ${item.name}`, e);
            }
            return item;
          })
        );
      };

      const [enrichedCore, enrichedCustom] = await Promise.all([
        enrichWithTimestamps(rawCore),
        enrichWithTimestamps(rawCustom),
      ]);

      const coreOrder = ['INBOX', 'STARRED', 'SENT', 'DRAFT', 'SPAM', 'TRASH'];
      enrichedCore.sort((a, b) => coreOrder.indexOf(a.id) - coreOrder.indexOf(b.id));
      enrichedCustom.sort((a, b) => (b.latestTimestamp || 0) - (a.latestTimestamp || 0));

      setMailboxes(enrichedCore);
      setCustomLabels(enrichedCustom);
    } catch (err) {
      console.error('Failed to fetch and sort labels:', err);
    }
  };

  const formatGmailTimestamp = (internalDateMs: number) => {
    const dateObj = new Date(internalDateMs);
    const now = Date.now();
    const diffDays = Math.floor((now - internalDateMs) / (1000 * 60 * 60 * 24));

    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const primary = diffDays === 0 ? timeStr : dateStr;
    const relative = getMinimalRelativeTime(internalDateMs);
    return { primary, relative };
  };

  const fetchMessages = async (token: string, folderId: string) => {
    setLoading(true);
    setActiveFolder(folderId);
    try {
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${folderId}&maxResults=25`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (listRes.status === 401 || listRes.status === 403) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return fetchMessages(newToken, folderId);
        } else {
          handleDisconnect();
          return;
        }
      }

      const listData = await listRes.json();

      if (!listData.messages) {
        setEmails([]);
        setLoading(false);
        return;
      }

      const detailedMessages = await Promise.all(
        listData.messages.map(async (msg: { id: string }) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const detailData = await detailRes.json();

          const headers = detailData.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          let rawFrom = getHeader('From') || 'Unknown Sender';
          let cleanFrom = rawFrom;
          let fromEmail = '';

          if (rawFrom.includes('<')) {
            const parts = rawFrom.split('<');
            cleanFrom = parts[0].replace(/"/g, '').trim();
            fromEmail = parts[1]?.replace('>', '').trim() || '';
          }
          if (!cleanFrom) cleanFrom = fromEmail;

          const internalDate = parseInt(detailData.internalDate || '0', 10);
          const { primary, relative } = formatGmailTimestamp(internalDate);
          const msgLabels: string[] = detailData.labelIds || [];

          return {
            id: msg.id,
            threadId: detailData.threadId,
            from: cleanFrom,
            fromEmail: fromEmail,
            subject: getHeader('Subject') || '(No Subject)',
            snippet: detailData.snippet || '',
            internalDate: internalDate,
            timePrimary: primary,
            timeRelative: relative,
            isUnread: msgLabels.includes('UNREAD'),
            isStarred: msgLabels.includes('STARRED'),
            labels: msgLabels,
          };
        })
      );

      detailedMessages.sort((a, b) => b.internalDate - a.internalDate);
      setEmails(detailedMessages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const startLoginFlow = () => {
    const clientId = localStorage.getItem('iris_g_client_id');
    if (!clientId) {
      alert('Please configure your Client ID in Settings first!');
      return;
    }
    const redirectUri = encodeURIComponent('https://irissys.vercel.app/api/auth/callback/google');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly');
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  };

  const getDisplayLabels = (msgLabels: string[]) => {
    return msgLabels.filter(
      (lbl) => !IGNORED_LABELS.includes(lbl) && lbl !== 'INBOX' && lbl !== 'SENT' && lbl !== activeFolder
    );
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden border border-slate-800/80 rounded-lg shadow-2xl">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <div className="w-60 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between p-3 flex-shrink-0">
        <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {/* App Title & Clean Live Indicator */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-lg shadow-cyan-400/50 animate-pulse"></span>
              <span className="font-semibold tracking-wide text-xs uppercase text-slate-200">
                Gmail OS
              </span>
            </div>
            {isConnected && (
              <span className="text-[10px] bg-slate-800 text-cyan-400 border border-slate-700/60 px-2 py-0.5 rounded font-mono">
                Live
              </span>
            )}
          </div>

          {/* Primary Mailboxes */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1 block">
              Mailboxes
            </span>
            {mailboxes.map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  const token = localStorage.getItem('iris_gmail_token');
                  if (token) fetchMessages(token, folder.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                  activeFolder === folder.id
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700/80 font-medium'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-xs font-mono text-slate-500">{folder.icon}</span>
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {folder.timeRelative && (
                    <span className="text-[9px] font-mono text-slate-500">
                      {folder.timeRelative}
                    </span>
                  )}
                  {folder.unreadCount ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      activeFolder === folder.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {folder.unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          {/* Dynamically Sorted Custom Labels */}
          {customLabels.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1 block">
                Labels (Recent Activity)
              </span>
              {customLabels.map((lbl) => (
                <button
                  key={lbl.id}
                  onClick={() => {
                    const token = localStorage.getItem('iris_gmail_token');
                    if (token) fetchMessages(token, lbl.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeFolder === lbl.id
                      ? 'bg-slate-800 text-cyan-300 font-medium border border-slate-700/80'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono text-slate-600">▪</span>
                    <span className="truncate text-[11px]">{lbl.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lbl.timeRelative && (
                      <span className="text-[9px] font-mono text-slate-500">
                        {lbl.timeRelative}
                      </span>
                    )}
                    {lbl.unreadCount ? (
                      <span className="text-[9px] font-mono text-cyan-300 bg-slate-800/80 border border-slate-700 px-1.5 py-0.2 rounded">
                        {lbl.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync & Disconnect Footer */}
        <div className="pt-3 border-t border-slate-800/80">
          {!isConnected ? (
            <button
              onClick={startLoginFlow}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 rounded-xl text-xs font-medium transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Connect Gmail</span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
              <button
                onClick={handleDisconnect}
                className="text-slate-500 hover:text-red-400 font-mono text-[11px] transition-colors"
                title="Disconnect & clear saved tokens"
              >
                ✕ Disconnect
              </button>
              <button
                onClick={() => {
                  const token = localStorage.getItem('iris_gmail_token');
                  if (token) initializeMailClient(token, activeFolder);
                }}
                className="text-slate-400 hover:text-cyan-300 font-medium text-[11px] transition-colors"
                title="Refresh Mailbox"
              >
                ↻ Sync
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN MAILBOX AREA */}
      <div className="flex-1 flex flex-col bg-slate-900/50 overflow-hidden">
        {/* Top Search & Action Header */}
        <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white tracking-tight">
              {labelMap[activeFolder] || activeFolder}
            </h1>
            <span className="text-[11px] text-slate-500 font-mono">
              ({emails.length} messages)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search mail..."
              className="bg-slate-950/80 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600 w-64 transition-all"
            />
          </div>
        </div>

        {/* Mail List View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 space-y-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs tracking-wide">Syncing mailbox stream...</span>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <div className="w-10 h-10 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-center text-slate-300 mb-3 font-mono text-lg">
              ◆
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Mirror Not Connected</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Connect your Google OAuth session to mirror your live inbox, drafts, and categories securely.
            </p>
            <button
              onClick={startLoginFlow}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium rounded-xl shadow-md transition-all"
            >
              Authorize Gmail Account
            </button>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-600 text-xs">
            <span className="text-lg mb-1 font-mono">⊘</span>
            <span>No messages found in {labelMap[activeFolder] || 'this folder'}.</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {emails.map((msg) => {
              const displayLabels = getDisplayLabels(msg.labels);

              return (
                <div
                  key={msg.id}
                  className={`flex items-center justify-between px-6 py-3.5 transition-all cursor-pointer group ${
                    msg.isUnread
                      ? 'bg-slate-800/40 hover:bg-slate-800/60 font-semibold text-white border-l-2 border-l-cyan-400'
                      : 'hover:bg-slate-800/30 text-slate-300 border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Left: Star + Sender + Cyan Notification Dot */}
                  <div className="flex items-center gap-3 w-64 flex-shrink-0 pr-4">
                    <button
                      className={`text-xs transition-transform hover:scale-125 ${
                        msg.isStarred ? 'text-yellow-400' : 'text-slate-600 group-hover:text-slate-400'
                      }`}
                      title={msg.isStarred ? 'Starred' : 'Not starred'}
                    >
                      ★
                    </button>
                    
                    {/* Glowing Cyan/White Notification Indicator */}
                    {msg.isUnread ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/80 flex-shrink-0 animate-pulse"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent flex-shrink-0"></span>
                    )}

                    <div className="truncate">
                      <span className={`text-xs truncate block ${msg.isUnread ? 'text-white font-bold' : 'text-slate-300'}`}>
                        {msg.from}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Subject + Snippet + Minimal Label Pills */}
                  <div className="flex-1 flex items-center gap-2 overflow-hidden pr-4">
                    <span className={`text-xs truncate flex-shrink-0 max-w-[40%] ${msg.isUnread ? 'text-white font-semibold' : 'text-slate-300'}`}>
                      {msg.subject}
                    </span>
                    <span className="text-slate-600 text-xs flex-shrink-0">-</span>
                    <span className="text-xs text-slate-400 truncate flex-1 font-normal">
                      {msg.snippet}
                    </span>

                    {/* Human-Readable Label Pills */}
                    {displayLabels.length > 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {displayLabels.slice(0, 2).map((lblId) => (
                          <span
                            key={lblId}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-400 font-mono whitespace-nowrap"
                          >
                            {labelMap[lblId] || lblId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Dual Timestamp Display */}
                  <div className="flex flex-col items-end flex-shrink-0 w-24 text-right">
                    <span className={`text-xs font-mono ${msg.isUnread ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                      {msg.timePrimary}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
                      {msg.timeRelative}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GmailWindow;
