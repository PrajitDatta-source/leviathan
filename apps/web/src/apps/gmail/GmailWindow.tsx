'use client';

import React, { useState, useEffect } from 'react';

interface EmailItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export function GmailWindow() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('gmail_code');
    const existingToken = localStorage.getItem('iris_gmail_token');

    if (code) {
      handleTokenExchange(code);
    } else if (existingToken) {
      setIsConnected(true);
      fetchInbox(existingToken);
    }
  }, []);

  const handleTokenExchange = async (code: string) => {
    setLoading(true);
    const clientId = localStorage.getItem('iris_g_client_id');
    const clientSecret = localStorage.getItem('iris_g_secret');

    if (!clientId || !clientSecret) {
      alert('Please save your Google Client ID and Secret in Settings first!');
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
        fetchInbox(data.access_token);
      } else {
        console.error('Token Exchange Error:', data);
      }
    } catch (err) {
      console.error('Failed to exchange token:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInbox = async (token: string) => {
    setLoading(true);
    try {
      // 1. Fetch the list of message IDs
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData = await listRes.json();
      
      if (!listData.messages) {
        setEmails([]);
        setLoading(false);
        return;
      }

      // 2. Parallel fetch metadata for each message ID
      const detailedMessages = await Promise.all(
        listData.messages.map(async (msg: { id: string }) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const detailData = await detailRes.json();

          // 3. Extract headers cleanly
          const headers = detailData.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || 'Unknown';

          let from = getHeader('From');
          // Clean up "Name <email@domain.com>" to just show the Name or clean email
          if (from.includes('<')) {
            from = from.split('<')[0].replace(/"/g, '').trim();
          }

          let dateStr = getHeader('Date');
          try {
            const dateObj = new Date(dateStr);
            dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          } catch (e) {
            dateStr = '';
          }

          return {
            id: msg.id,
            from: from || 'Unknown Sender',
            subject: getHeader('Subject') || '(No Subject)',
            snippet: detailData.snippet || '',
            date: dateStr,
          };
        })
      );

      setEmails(detailedMessages);
    } catch (err) {
      console.error('Failed to fetch inbox details:', err);
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

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/95 text-white p-4 font-sans select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">Gmail Mirror</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={() => {
                const token = localStorage.getItem('iris_gmail_token');
                if (token) fetchInbox(token);
              }}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs cursor-pointer"
              title="Refresh Inbox"
            >
              ↻ Refresh
            </button>
          )}
          {!isConnected && (
            <button
              onClick={startLoginFlow}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {loading && (
        <div className="flex flex-col items-center justify-center flex-1 space-y-2 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs">Syncing encrypted inbox stream...</span>
        </div>
      )}

      {isConnected && !loading && (
        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {emails.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">No messages found in your inbox.</div>
          ) : (
            emails.map((msg) => (
              <div 
                key={msg.id} 
                className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-blue-400 truncate max-w-[70%] group-hover:text-blue-300 transition-colors">
                    {msg.from}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{msg.date}</span>
                </div>
                
                <div className="text-xs font-medium text-slate-200 truncate mb-0.5">
                  {msg.subject}
                </div>
                
                <div className="text-[11px] text-slate-400 line-clamp-1 leading-relaxed">
                  {msg.snippet}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default GmailWindow;
