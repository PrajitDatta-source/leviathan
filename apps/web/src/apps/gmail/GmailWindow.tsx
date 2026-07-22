'use client';

import React, { useState, useEffect, useRef } from 'react';

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

interface FullEmail {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  subject: string;
  htmlBody: string;
  plainBody: string;
  otpCode?: string;
  quickLinks: { text: string; url: string }[];
  attachments: { id: string; filename: string; mimeType: string; size: number }[];
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

// Ultra-Clean Monochrome Geometric Symbols (ZERO Emojis)
const FOLDER_CONFIG: Record<string, { name: string; icon: string }> = {
  INBOX: { name: 'Inbox', icon: '▪' },
  STARRED: { name: 'Starred', icon: '★' },
  SENT: { name: 'Sent', icon: '↗' },
  DRAFT: { name: 'Drafts', icon: '▫' },
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

const CACHE_TTL_MS = 5 * 60 * 1000;

// Was hardcoded to https://irissys.vercel.app/... which breaks local dev
// (Google rejects a redirect_uri that wasn't requested) and breaks the
// moment this gets deployed to any other domain. Derives from wherever the
// app is actually running instead.
//
// NOTE: this only works if the exact URI this resolves to is also added
// under "Authorized redirect URIs" for your OAuth client in Google Cloud
// Console — e.g. both https://irissys.vercel.app/api/auth/callback/google
// AND http://localhost:3000/api/auth/callback/google (or whatever port you
// dev on) need to be registered there if you want both to work.
function getGoogleRedirectUri(): string {
  return `${window.location.origin}/api/auth/callback/google`;
}

export function GmailWindow() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [mailboxes, setMailboxes] = useState<LabelItem[]>([]);
  const [customLabels, setCustomLabels] = useState<LabelItem[]>([]);
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});
  const [activeFolder, setActiveFolder] = useState<string>('INBOX');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState<number>(0);

  // FULL READER STATE (Images displayed by default!)
  const [selectedEmail, setSelectedEmail] = useState<FullEmail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [showImages, setShowImages] = useState<boolean>(true);
  const [otpCopied, setOtpCopied] = useState<boolean>(false);

  const cacheRef = useRef<Record<string, { timestamp: number; items: EmailItem[] }>>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('gmail_code');
    const existingToken = localStorage.getItem('iris_gmail_token');

    if (code) {
      handleTokenExchange(code);
    } else if (existingToken) {
      setIsConnected(true);
      initializeMailClient(existingToken, 'INBOX', false);
    }
  }, []);

  const handleDisconnect = () => {
    localStorage.removeItem('iris_gmail_token');
    localStorage.removeItem('iris_gmail_refresh_token');
    cacheRef.current = {};
    setIsConnected(false);
    setEmails([]);
    setMailboxes([]);
    setCustomLabels([]);
    setSelectedEmail(null);
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
          redirect_uri: getGoogleRedirectUri(),
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
        initializeMailClient(data.access_token, 'INBOX', true);
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

  const initializeMailClient = async (token: string, folderId: string, forceRefresh = false) => {
    await fetchLabelsAndActivity(token);
    await fetchMessages(token, folderId, forceRefresh);
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

  const fetchMessages = async (token: string, folderId: string, forceRefresh = false) => {
    setActiveFolder(folderId);
    setSelectedEmail(null);

    if (!forceRefresh && cacheRef.current[folderId]) {
      const cached = cacheRef.current[folderId];
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setEmails(cached.items);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${folderId}&maxResults=25`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (listRes.status === 401 || listRes.status === 403) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return fetchMessages(newToken, folderId, forceRefresh);
        } else {
          handleDisconnect();
          return;
        }
      }

      const listData = await listRes.json();

      if (!listData.messages) {
        setEmails([]);
        cacheRef.current[folderId] = { timestamp: Date.now(), items: [] };
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
      
      cacheRef.current[folderId] = {
        timestamp: Date.now(),
        items: detailedMessages,
      };

      setEmails(detailedMessages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const decodeBase64URL = (str: string) => {
    try {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (e) {
      console.error('Base64 decode error:', e);
      return '';
    }
  };

  const extractOTP = (text: string, subject: string): string | undefined => {
    const combined = `${subject}\n${text}`;
    const keywordRegex = /(?:otp|code|pin|password|token|verification|verify|verifying|security code)[\s:#*-]{1,6}([A-Z0-9]{4,8})\b/i;
    const match = combined.match(keywordRegex);
    if (match && match[1]) {
      if (/^202[0-9]$/.test(match[1]) && match[1].length === 4) return undefined;
      return match[1];
    }
    const standalone6 = /\b(\d{6})\b/;
    const match6 = combined.match(standalone6);
    if (match6 && match6[1]) {
      return match6[1];
    }
    return undefined;
  };

  const extractLinks = (html: string) => {
    const links: { text: string; url: string }[] = [];
    const regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*?>(.*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const url = match[2];
      const rawText = match[3].replace(/<[^>]*>/g, '').trim();
      if (url && url.startsWith('http') && rawText.length > 2 && rawText.length < 35) {
        if (!/unsubscribe|privacy|terms|preferences|browser|view in/i.test(rawText)) {
          links.push({ text: rawText, url });
        }
      }
    }
    return links.slice(0, 4);
  };

  const openEmailDetail = async (messageId: string) => {
    const token = localStorage.getItem('iris_gmail_token');
    if (!token) return;

    setLoadingDetail(true);
    setShowImages(true); // Default to viewing images out of the box!
    setOtpCopied(false);

    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 401 || res.status === 403) {
        const newToken = await refreshAccessToken();
        if (newToken) return openEmailDetail(messageId);
      }

      const data = await res.json();
      const headers = data.payload?.headers || [];
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

      let htmlBody = '';
      let plainBody = '';
      const attachments: { id: string; filename: string; mimeType: string; size: number }[] = [];

      const parseParts = (parts: any[]) => {
        parts.forEach((part) => {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0,
            });
          }
          if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody += decodeBase64URL(part.body.data);
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            plainBody += decodeBase64URL(part.body.data);
          }
          if (part.parts) {
            parseParts(part.parts);
          }
        });
      };

      if (data.payload?.parts) {
        parseParts(data.payload.parts);
      } else if (data.payload?.body?.data) {
        if (data.payload.mimeType === 'text/html') {
          htmlBody = decodeBase64URL(data.payload.body.data);
        } else {
          plainBody = decodeBase64URL(data.payload.body.data);
        }
      }

      const subject = getHeader('Subject') || '(No Subject)';
      const otpCode = extractOTP(plainBody || htmlBody.replace(/<[^>]*>/g, ' '), subject);
      const quickLinks = extractLinks(htmlBody);

      setSelectedEmail({
        id: data.id,
        threadId: data.threadId,
        from: cleanFrom,
        fromEmail: fromEmail,
        to: getHeader('To') || 'Me',
        date: getHeader('Date') || '',
        subject: subject,
        htmlBody: htmlBody,
        plainBody: plainBody,
        otpCode: otpCode,
        quickLinks: quickLinks,
        attachments: attachments,
      });
    } catch (err) {
      console.error('Failed to fetch full email:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const downloadAttachment = async (attachmentId: string, filename: string, mimeType: string) => {
    if (!selectedEmail) return;
    const token = localStorage.getItem('iris_gmail_token');
    if (!token) return;

    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${selectedEmail.id}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.data) {
        const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error('Failed to download attachment:', e);
      alert('Failed to download attachment.');
    }
  };

  const startLoginFlow = () => {
    const clientId = localStorage.getItem('iris_g_client_id');
    if (!clientId) {
      alert('Please configure your Client ID in Settings first!');
      return;
    }
    const redirectUri = encodeURIComponent(getGoogleRedirectUri());
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly');
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  };

  const getDisplayLabels = (msgLabels: string[]) => {
    return msgLabels.filter(
      (lbl) => !IGNORED_LABELS.includes(lbl) && lbl !== 'INBOX' && lbl !== 'SENT' && lbl !== activeFolder
    );
  };

  const getPreparedIframeDoc = (email: FullEmail) => {
    let content = email.htmlBody || `<pre style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; white-space: pre-wrap; font-size: 14px; color: #e2e8f0; padding: 16px;">${email.plainBody}</pre>`;
    
    if (!showImages) {
      content = content.replace(
        /<img\b([^>]*)src\s*=\s*(["']?)([^"'\s>]+)\2([^>]*)>/gi,
        '<div style="border: 1px dashed #334155; padding: 16px; border-radius: 8px; text-align: center; color: #94a3b8; font-family: -apple-system, sans-serif; font-size: 12px; background: #131314; margin: 12px 0;">[ Image hidden for privacy — Click "Display Images" in the header to view ]</div>'
      );
      content = content.replace(/background(-image)?\s*:\s*url\([^)]+\)/gi, 'background: none');
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <base target="_blank">
          <style>
            :root { color-scheme: dark !important; }
            body, table, td, tr, th, div, p, span, h1, h2, h3, h4, h5, h6, ul, ol, li {
              background-color: #131314 !important;
              color: #e2e8f0 !important;
              border-color: #334155 !important;
            }
            a, a span, a font {
              color: #7dd3fc !important;
              text-decoration: underline !important;
            }
            img { max-width: 100% !important; height: auto !important; }
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #131314; }
            ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
            body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.5; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  };

  return (
    <div className="flex h-full w-full bg-[#131314] text-slate-200 font-sans select-none overflow-hidden border border-slate-800/80 rounded-xl shadow-2xl">
      {/* 1. LEFT SIDEBAR (MD3 Pill Navigation + Timestamps) */}
      <div className="w-64 bg-[#1a1a1c] border-r border-slate-800/60 flex flex-col justify-between py-3 pr-3 flex-shrink-0">
        <div className="space-y-6 overflow-y-auto pl-3 pr-1 custom-scrollbar">
          {/* Authentic Clean Title */}
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              Gmail
            </span>
          </div>

          {/* MD3 Mailboxes with Activity Timestamps */}
          <div className="space-y-1 -ml-3">
            {mailboxes.map((folder) => {
              const isActive = activeFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    const token = localStorage.getItem('iris_gmail_token');
                    if (token) fetchMessages(token, folder.id, false);
                  }}
                  className={`w-full flex items-center justify-between px-6 py-2 rounded-r-full text-sm font-normal transition-colors group ${
                    isActive
                      ? 'bg-slate-800/80 font-semibold text-slate-100'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <span className="text-sm font-mono text-slate-500 group-hover:text-slate-300">{folder.icon}</span>
                    <span className="truncate">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {folder.timeRelative && (
                      <span className="text-[11px] font-mono text-slate-500 font-normal">
                        {folder.timeRelative}
                      </span>
                    )}
                    {folder.unreadCount ? (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {folder.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Labels Section with Activity Timestamps */}
          {customLabels.length > 0 && (
            <div className="space-y-1 pt-4 border-t border-slate-800/60 -ml-3">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-6 mb-2 block">
                Labels
              </span>
              {customLabels.map((lbl) => {
                const isActive = activeFolder === lbl.id;
                return (
                  <button
                    key={lbl.id}
                    onClick={() => {
                      const token = localStorage.getItem('iris_gmail_token');
                      if (token) fetchMessages(token, lbl.id, false);
                    }}
                    className={`w-full flex items-center justify-between px-6 py-1.5 rounded-r-full text-xs transition-colors group ${
                      isActive
                        ? 'bg-slate-800/80 font-semibold text-slate-100'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <span className="text-slate-600 font-mono text-[10px] group-hover:text-slate-400">▪</span>
                      <span className="truncate">{lbl.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lbl.timeRelative && (
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          {lbl.timeRelative}
                        </span>
                      )}
                      {lbl.unreadCount ? (
                        <span className="text-[11px] font-mono text-slate-300 font-semibold">{lbl.unreadCount}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clean Footer Controls */}
        <div className="pt-3 border-t border-slate-800/60 pl-3">
          {!isConnected ? (
            <button
              onClick={startLoginFlow}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Connect Gmail</span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-800/60 text-xs">
              <button
                onClick={handleDisconnect}
                className="text-slate-400 hover:text-slate-200 transition-colors font-normal"
                title="Disconnect Account"
              >
                Sign out
              </button>
              <button
                onClick={() => {
                  const token = localStorage.getItem('iris_gmail_token');
                  if (token) initializeMailClient(token, activeFolder, true);
                }}
                className="text-slate-300 hover:text-white font-medium transition-colors flex items-center gap-1 font-mono"
                title="Refresh Mailbox"
              >
                <span>↻</span> Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col bg-[#131314] overflow-hidden">
        {selectedEmail ? (
          /* ================= FULL EMAIL THREAD VIEW ================= */
          <div className="flex-1 flex flex-col overflow-hidden bg-[#131314]">
            {/* Top Action Bar */}
            <div className="h-16 border-b border-slate-800/60 px-6 flex items-center justify-between bg-[#1a1a1c]/80 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors text-xs font-mono border border-slate-700/60"
                  title="Back to list"
                >
                  ← Back to {labelMap[activeFolder] || activeFolder}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImages(!showImages)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors font-mono font-medium flex items-center gap-2"
                >
                  <span>{showImages ? '[ - ] Hide Images' : '[ + ] Display Images'}</span>
                </button>
              </div>
            </div>

            {/* Thread Header Info Banner */}
            <div className="p-6 border-b border-slate-800/60 bg-[#1a1a1c]/40 space-y-4 flex-shrink-0">
              <h2 className="text-xl font-normal text-slate-100 tracking-tight leading-snug">
                {selectedEmail.subject}
              </h2>

              <div className="flex items-start justify-between text-xs text-slate-400 pt-2">
                <div className="flex items-center gap-3">
                  {/* Clean Initial Avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-slate-300 text-sm flex-shrink-0 uppercase font-mono">
                    {selectedEmail.from.charAt(0) || '?'}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 text-sm">{selectedEmail.from}</span>
                      <span className="text-slate-500 font-mono text-xs">&lt;{selectedEmail.fromEmail}&gt;</span>
                    </div>
                    <div className="text-xs text-slate-500">to {selectedEmail.to}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono">{selectedEmail.date}</div>
              </div>

              {/* SLEEK MONOCHROME OTP BANNER (ZERO EMOJIS) */}
              {selectedEmail.otpCode && (
                <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-300">CODE</span>
                    <div>
                      <span className="text-slate-400 font-normal block text-[10px] uppercase tracking-wider">Verification Code Detected</span>
                      <span className="text-base font-mono font-bold text-white tracking-widest">{selectedEmail.otpCode}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedEmail.otpCode || '');
                      setOtpCopied(true);
                      setTimeout(() => setOtpCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-xs font-medium border border-slate-600 transition-colors"
                  >
                    {otpCopied ? '✓ Copied' : 'Copy Code'}
                  </button>
                </div>
              )}

              {/* QUICK ACTIONS BAR */}
              {selectedEmail.quickLinks.length > 0 && (
                <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                  <span className="text-xs text-slate-500 flex-shrink-0 font-mono uppercase tracking-wider text-[10px]">Quick actions:</span>
                  {selectedEmail.quickLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3 py-1 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 font-mono"
                    >
                      <span>↗ {link.text}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* ATTACHMENTS PILL LIST */}
              {selectedEmail.attachments.length > 0 && (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60 overflow-x-auto">
                  <span className="text-xs text-slate-500 flex-shrink-0 font-mono text-[10px] uppercase tracking-wider">
                    Attachments ({selectedEmail.attachments.length}):
                  </span>
                  {selectedEmail.attachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => downloadAttachment(att.id, att.filename, att.mimeType)}
                      className="text-xs bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-3 py-1 rounded transition-colors flex items-center gap-2 whitespace-nowrap group font-mono"
                    >
                      <span>↓</span>
                      <span className="font-medium truncate max-w-[200px]">{att.filename}</span>
                      <span className="text-slate-500">({Math.round(att.size / 1024)} KB)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Email Render Frame */}
            <div className="flex-1 overflow-hidden bg-[#131314] relative">
              {loadingDetail ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-slate-400 bg-[#131314] z-10">
                  <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-mono">Loading message...</span>
                </div>
              ) : (
                <iframe
                  sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  className="w-full h-full border-0 bg-[#131314]"
                  srcDoc={getPreparedIframeDoc(selectedEmail)}
                />
              )}
            </div>
          </div>
        ) : (
          /* ================= STANDARD GMAIL LIST VIEW ================= */
          <>
            {/* MD3 Capsule Search Header with SVG Icon */}
            <div className="h-16 border-b border-slate-800/60 px-6 flex items-center justify-between bg-[#1a1a1c]/60 flex-shrink-0">
              <div className="flex items-center gap-4 flex-1 max-w-2xl">
                <div className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 border border-transparent focus-within:border-slate-700 focus-within:bg-[#1a1a1c] rounded-full px-5 py-2 w-full transition-all">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search in mail"
                    className="bg-transparent text-sm text-slate-200 placeholder-slate-400 focus:outline-none w-full font-normal"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pl-4">
                <span className="text-xs text-slate-400 font-mono">
                  {emails.length > 0 ? `1–${emails.length} of ${emails.length}` : '0 messages'}
                </span>
              </div>
            </div>

            {/* Message Stream */}
            {loading ? (
              <div className="flex flex-col items-center justify-center flex-1 space-y-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono">Loading...</span>
              </div>
            ) : !isConnected ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 font-mono text-xl">
                  ▪
                </div>
                <h3 className="text-base font-normal text-slate-200 mb-1">Not signed in</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-6">
                  Sign in with your Google account to read, search, and manage your emails.
                </p>
                <button
                  onClick={startLoginFlow}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                  Sign in to Gmail
                </button>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-500 text-xs font-normal">
                <span className="text-xl mb-2 font-mono">⊘</span>
                <span>Your {labelMap[activeFolder]?.toLowerCase() || 'mailbox'} is empty.</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar">
                {emails.map((msg) => {
                  const displayLabels = getDisplayLabels(msg.labels);

                  return (
                    <div
                      key={msg.id}
                      onClick={() => openEmailDetail(msg.id)}
                      className={`flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer group ${
                        msg.isUnread
                          ? 'bg-[#1a1a1c] font-bold text-white'
                          : 'bg-[#131314] hover:bg-slate-900/60 font-normal text-slate-300'
                      }`}
                    >
                      {/* Left: Star + Sender Name */}
                      <div className="flex items-center gap-3 w-56 flex-shrink-0 pr-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className={`text-sm transition-transform hover:scale-110 ${
                            msg.isStarred ? 'text-amber-400 font-normal' : 'text-slate-600 group-hover:text-slate-400'
                          }`}
                          title={msg.isStarred ? 'Starred' : 'Not starred'}
                        >
                          {msg.isStarred ? '★' : '☆'}
                        </button>
                        
                        <div className="truncate">
                          <span className={`text-sm truncate block ${msg.isUnread ? 'text-white font-bold' : 'text-slate-300 font-normal'}`}>
                            {msg.from}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Subject - Snippet + Clean Pill Labels */}
                      <div className="flex-1 flex items-center gap-2 overflow-hidden pr-6">
                        <span className={`text-sm truncate flex-shrink-0 max-w-[45%] ${msg.isUnread ? 'text-white font-semibold' : 'text-slate-300 font-normal'}`}>
                          {msg.subject}
                        </span>
                        <span className="text-slate-600 text-sm flex-shrink-0">-</span>
                        <span className="text-sm text-slate-400 truncate flex-1 font-normal">
                          {msg.snippet}
                        </span>

                        {displayLabels.length > 0 && (
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            {displayLabels.slice(0, 2).map((lblId) => (
                              <span
                                key={lblId}
                                className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-normal whitespace-nowrap border border-slate-700/40"
                              >
                                {labelMap[lblId] || lblId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Timestamp vs. Minimal Hover Action Toolbar */}
                      <div className="flex items-center justify-end flex-shrink-0 w-28 text-right">
                        <span className={`text-xs font-mono group-hover:hidden ${msg.isUnread ? 'text-white font-semibold' : 'text-slate-400'}`}>
                          {msg.timePrimary}
                        </span>

                        {/* Hover State: Ultra-Clean Monochrome Action Symbols */}
                        <div className="hidden group-hover:flex items-center gap-2 text-slate-400 font-mono text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('Archive action mapped.');
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Archive"
                          >
                            ↓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('Delete action mapped.');
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Delete"
                          >
                            ✕
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Mark as read"
                          >
                            ▪
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default GmailWindow;
