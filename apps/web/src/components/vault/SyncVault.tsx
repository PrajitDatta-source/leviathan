'use client';

import React, { useState, useEffect } from 'react';
import { pushStateToCloud, hydrateStateFromCloud } from '@/lib/vault';

export default function SyncVault() {
  const [projectId, setProjectId] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<{ text: string; isError?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('iris_supabase_url') || '';
    const savedKey = localStorage.getItem('iris_supabase_anon_key') || '';
    
    // Extract project ID from https://PROJECT_ID.supabase.co if saved
    if (savedUrl) {
      const match = savedUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (match && match[1]) setProjectId(match[1]);
    }
    if (savedKey) setAnonKey(savedKey);
  }, []);

  const handleSaveCredentials = () => {
    if (!projectId || !anonKey) {
      setStatus({ text: 'Enter both Project ID and Anon Key.', isError: true });
      return;
    }
    const formattedUrl = `https://${projectId.trim()}.supabase.co`;
    localStorage.setItem('iris_supabase_url', formattedUrl);
    localStorage.setItem('iris_supabase_anon_key', anonKey.trim());
    setStatus({ text: '✓ Supabase credentials saved locally.' });
  };

  const handlePush = async () => {
    if (!pin || pin.length < 4) {
      setStatus({ text: 'PIN must be at least 4 characters.', isError: true });
      return;
    }
    setLoading(true);
    setStatus({ text: 'Encrypting and pushing to vault...' });

    const res = await pushStateToCloud(pin);
    setLoading(false);
    setStatus({ text: (res.success ? '✓ ' : '✕ ') + res.message, isError: !res.success });
    if (res.success) setPin('');
  };

  const handleHydrate = async () => {
    if (!pin || pin.length < 4) {
      setStatus({ text: 'Enter your Master PIN to unlock.', isError: true });
      return;
    }
    setLoading(true);
    setStatus({ text: 'Pulling and decrypting vault...' });

    const res = await hydrateStateFromCloud(pin);
    setLoading(false);
    setStatus({ text: (res.success ? '✓ ' : '✕ ') + res.message, isError: !res.success });
    
    if (res.success) {
      setPin('');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="bg-[#131314] border border-slate-800/80 rounded-xl p-6 max-w-md w-full text-slate-200 font-sans shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">Zero-Knowledge Vault</h3>
          <p className="text-xs text-slate-400 mt-0.5">AES-256 encrypted cloud state persistence</p>
        </div>
        <span className="text-xs font-mono px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400">
          POSTGRES
        </span>
      </div>

      <div className="space-y-4">
        {/* Supabase Project ID & Key Config */}
        <div className="space-y-3 pb-3 border-b border-slate-800/60">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
              Supabase Project ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="e.g. abcdefghijklm"
              className="w-full bg-[#1a1a1c] border border-slate-700 focus:border-slate-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none font-mono transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
              Supabase Anon Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJh..."
              className="w-full bg-[#1a1a1c] border border-slate-700 focus:border-slate-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none font-mono transition-colors"
            />
          </div>
          <button
            onClick={handleSaveCredentials}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors border border-slate-700/60"
          >
            Save Credentials Locally
          </button>
        </div>

        {/* Master PIN Input */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
            Master PIN / Passphrase
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter encryption PIN..."
            className="w-full bg-[#1a1a1c] border border-slate-700 focus:border-slate-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none font-mono transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handlePush}
            disabled={loading}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium font-mono transition-colors border border-slate-700/60 flex items-center justify-center gap-1.5"
          >
            <span>↑ Push State</span>
          </button>
          
          <button
            onClick={handleHydrate}
            disabled={loading}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium font-mono transition-colors border border-slate-700/60 flex items-center justify-center gap-1.5"
          >
            <span>↓ Pull & Hydrate</span>
          </button>
        </div>

        {status && (
          <div
            className={`mt-3 p-3 rounded-lg border text-xs font-mono transition-all ${
              status.isError
                ? 'bg-slate-900/80 border-slate-700 text-slate-300 font-semibold'
                : 'bg-[#1a1a1c] border-slate-800 text-slate-300'
            }`}
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
