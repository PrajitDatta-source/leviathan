'use client';

import React, { useState, useEffect } from 'react';

export function GmailWindow() {
  const [emails, setEmails] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Check if we just got redirected back with an auth code in the URL
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
      // 2. Swap the temporary code for a real Google Access Token
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
        // 3. Save the token and clean up the URL bar so the code disappears
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
      // 4. Fetch the actual list of emails using the new token!
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.messages) {
        setEmails(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <h2 className="text-base font-semibold tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Gmail Mirror
        </h2>
        {!isConnected && (
          <button
            onClick={startLoginFlow}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            Connect Gmail
          </button>
        )}
      </div>

      {loading && <div className="text-center py-8 text-xs text-slate-400">Communicating with Google servers...</div>}

      {isConnected && !loading && (
        <div className="space-y-2 overflow-y-auto flex-1">
          <p className="text-xs text-emerald-400 font-medium mb-2">● Live Session Active</p>
          {emails.length === 0 ? (
            <p className="text-xs text-slate-500">No recent messages found.</p>
          ) : (
            emails.map((msg, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                Message ID: <span className="font-mono text-slate-400">{msg.id}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default GmailWindow;
