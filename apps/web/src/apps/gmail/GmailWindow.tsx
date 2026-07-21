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
}

// Map Google System IDs to Clean UI Names
const SYSTEM_LABEL_MAP: Record<string, string> = {
  INBOX: 'Inbox',
  STARRED: 'Starred',
  SENT: 'Sent',
  DRAFT: 'Drafts',
  SPAM: 'Spam',
  TRASH: 'Bin',
  IMPORTANT: 'Important',
  CATEGORY_PROMOTIONS: 'Promotions',
  CATEGORY_SOCIAL: 'Social',
  CATEGORY_UPDATES: 'Updates',
  CATEGORY_FORUMS: 'Forums',
  CATEGORY_PERSONAL: 'Personal',
};

export function GmailWindow() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [labelMap, setLabelMap] = useState<Record<string, string>>(SYSTEM_LABEL_MAP);
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
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsConnected(true);
        initializeMailClient(data.access_token, 'INBOX');
      } else {
        console.error('Token Exchange Error:', data);
      }
    } catch (err) {
      console.error('Failed to exchange token:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeMailClient = async (token: string, folderId: string) => {
    setLoading(true);
    await fetchLabels(token);
    await fetchMessages(token, folderId);
    setLoading(false);
  };

  // 1. Fetch all user labels to translate ugly IDs to human-readable names
  const fetchLabels = async (token: string) => {
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.labels) {
        const newMap: Record<string, string> = { ...SYSTEM_LABEL_MAP };
        const parsedLabels: LabelItem[] = [];
        let inboxUnread = 0;

        data.labels.forEach((lbl: any) => {
          const cleanName = SYSTEM_LABEL_MAP[lbl.id] || lbl.name;
          newMap[lbl.id] = cleanName;

          if (lbl.id === 'INBOX' && lbl.messagesUnread) {
            inboxUnread = lbl.messagesUnread;
          }

          // Keep track of custom and category labels for the sidebar
          if (lbl.type === 'user' || lbl.id.startsWith('CATEGORY_')) {
            parsedLabels.push({
              id: lbl.id,
              name: cleanName,
              type: lbl.type,
              unreadCount: lbl.messagesUnread || 0,
            });
          }
        });

        setLabelMap(newMap);
        setLabels(parsedLabels);
        setUnreadInboxCount(inboxUnread);
      }
    } catch (err) {
      console.error('Failed to fetch labels:', err);
    }
  };

  // 2. Format precise and relative Gmail timestamps
  const formatGmailTimestamp = (internalDateMs: number) => {
    const now = Date.now();
    const diffMs = now - internalDateMs;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const dateObj = new Date(internalDateMs);
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let relative = '';
    if (diffMins < 1) relative = 'Just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else if (diffDays < 30) relative = `${Math.floor(diffDays / 7)}w ago`;
    else relative = `${Math.floor(diffDays / 30)}mo ago`;

    // If today, show exact time (13:45). If older, show date (Jul 18).
    const primary = diffDays === 0 ? timeStr : dateStr;
    return { primary, relative };
  };

  // 3. Fetch messages for the selected folder & sort by newest first
  const fetchMessages = async (token: string, folderId: string) => {
    setLoading(true);
    setActiveFolder(folderId);
    try {
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${folderId}&maxResults=25`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

      // Explicitly sort by timestamp descending (newest mail at the top!)
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
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  };

  // Helper to filter out system labels that don't need UI pills (like UNREAD or current folder)
  const getDisplayLabels = (msgLabels: string[]) => {
    return msgLabels.filter(
      (lbl) => lbl !== 'UNREAD' && lbl !== 'INBOX' && lbl !== 'IMPORTANT' && lbl !== 'SENT' && lbl !== activeFolder
    );
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden border border-slate-800/80 rounded-lg shadow-2xl">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <div className="w-56 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between p-3 flex-shrink-0">
        <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {/* App Title & Compose Mock */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-lg shadow-red-500/40 animate-pulse"></span>
              <span className="font-bold tracking-wide text-sm bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Gmail OS
              </span>
            </div>
            {isConnected && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Live
              </span>
            )}
          </div>

          {/* Primary Folders */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1 block">
              Mailboxes
            </span>
            {[
              { id: 'INBOX', label: 'Inbox', icon: '📥', count: unreadInboxCount },
              { id: 'STARRED', label: 'Starred', icon: '⭐' },
              { id: 'SENT', label: 'Sent', icon: '📤' },
              { id: 'DRAFT', label: 'Drafts', icon: '📝' },
              { id: 'SPAM', label: 'Spam', icon: '⚠️' },
              { id: 'TRASH', label: 'Bin', icon: '🗑️' },
            ].map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  const token = localStorage.getItem('iris_gmail_token');
                  if (token) fetchMessages(token, folder.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeFolder === folder.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-sm">{folder.icon}</span>
                  <span className="truncate">{folder.label}</span>
                </div>
                {folder.count ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeFolder === folder.id ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {folder.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Categories & Custom Labels */}
          {labels.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1 block">
                Labels & Categories
              </span>
              {labels.map((lbl) => (
                <button
                  key={lbl.id}
                  onClick={() => {
                    const token = localStorage.getItem('iris_gmail_token');
                    if (token) fetchMessages(token, lbl.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    activeFolder === lbl.id
                      ? 'bg-slate-800 text-blue-400 font-medium border border-slate-700/60'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0"></span>
                    <span className="truncate text-[11px]">{lbl.name}</span>
                  </div>
                  {lbl.unreadCount ? (
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                      {lbl.unreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account / Connect Action */}
        <div className="pt-3 border-t border-slate-800/80">
          {!isConnected ? (
            <button
              onClick={startLoginFlow}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Connect Gmail</span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
              <span className="text-slate-400 truncate text-[11px]">Synced with Google</span>
              <button
                onClick={() => {
                  const token = localStorage.getItem('iris_gmail_token');
                  if (token) initializeMailClient(token, activeFolder);
                }}
                className="text-blue-400 hover:text-blue-300 font-medium text-[11px] cursor-pointer"
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
            <h1 className="text-base font-semibold text-white tracking-tight">
              {labelMap[activeFolder] || activeFolder}
            </h1>
            <span className="text-xs text-slate-500 font-mono">
              ({emails.length} messages)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search mail..."
                className="bg-slate-950/80 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 w-64 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Mail List View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 space-y-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs tracking-wide">Fetching & decrypting mailbox stream...</span>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 text-xl">
              📧
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Mirror Not Connected</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Connect your Google OAuth session to mirror your live inbox, drafts, and categories securely.
            </p>
            <button
              onClick={startLoginFlow}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              Authorize Gmail Account
            </button>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-500 text-xs">
            <span className="text-2xl mb-2">📭</span>
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
                      ? 'bg-blue-950/20 hover:bg-blue-900/30 font-semibold text-white border-l-2 border-l-blue-500'
                      : 'hover:bg-slate-800/40 text-slate-300 border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Left: Star + Sender + Notification Dot */}
                  <div className="flex items-center gap-3 w-64 flex-shrink-0 pr-4">
                    <button
                      className={`text-sm transition-transform hover:scale-125 ${
                        msg.isStarred ? 'text-yellow-400' : 'text-slate-600 group-hover:text-slate-400'
                      }`}
                      title={msg.isStarred ? 'Starred' : 'Not starred'}
                    >
                      ★
                    </button>
                    
                    {/* Unread Glowing Dot */}
                    {msg.isUnread ? (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-md shadow-blue-500/50 flex-shrink-0 animate-pulse"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-transparent flex-shrink-0"></span>
                    )}

                    <div className="truncate">
                      <span className={`text-xs truncate block ${msg.isUnread ? 'text-white font-bold' : 'text-slate-300'}`}>
                        {msg.from}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Subject + Snippet + Clean Label Pills */}
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
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium whitespace-nowrap"
                          >
                            {labelMap[lblId] || lblId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Dual Timestamp Display (e.g. "13:45" + "12m ago" on hover/subtle) */}
                  <div className="flex flex-col items-end flex-shrink-0 w-24 text-right">
                    <span className={`text-xs font-mono ${msg.isUnread ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
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
