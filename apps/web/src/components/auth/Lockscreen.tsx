'use client';

import React, { useState, useEffect } from 'react';
import { hydrateStateFromCloud, setSessionPin, getSessionPin } from '@/lib/vault';

export default function Lockscreen({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Checks RAM on boot — automatically locked if you refreshed the page!
  useEffect(() => {
    if (getSessionPin()) setUnlocked(true);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    setError('');

    const res = await hydrateStateFromCloud(pin);
    setLoading(false);

    if (res.success) {
      setSessionPin(pin);
      setUnlocked(true);
    } else {
      setError(res.message);
      setPin('');
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="h-screen w-screen bg-[#0a0a0c] flex items-center justify-center text-slate-200 font-mono selection:bg-cyan-500/30">
      <form onSubmit={handleUnlock} className="w-52 space-y-3 text-center">
        
        {/* Minimalist Header */}
        <div className="text-xs tracking-[0.25em] text-slate-400 font-bold uppercase select-none">
          IRIS OS
        </div>
        
        {/* PIN Input */}
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className="w-full bg-[#121214] border border-slate-800 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-center text-white placeholder-slate-600 focus:outline-none tracking-widest text-sm transition-colors shadow-lg"
        />

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white rounded-lg text-xs transition-colors border border-slate-700/60 shadow"
        >
          {loading ? '...' : 'UNLOCK'}
        </button>

        {/* Minimal Error Display */}
        {error && <div className="text-[11px] text-red-400 pt-1">{error}</div>}
      </form>
    </div>
  );
}
