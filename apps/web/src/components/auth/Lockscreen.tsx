'use client';

import React, { useState, useEffect } from 'react';
import { hydrateStateFromCloud, setSessionPin, getSessionPin } from '@/lib/vault';

interface LockscreenProps {
  children: React.ReactNode;
}

export default function Lockscreen({ children }: LockscreenProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check active RAM on mount (This is wiped empty on every page refresh!)
  useEffect(() => {
    if (getSessionPin()) {
      setUnlocked(true);
    } else {
      setUnlocked(false);
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 characters.');
      return;
    }

    setLoading(true);
    setError('');

    // 1. Automatically pull ciphertext from Supabase & attempt AES decryption
    const res = await hydrateStateFromCloud(pin);
    setLoading(false);

    // If decryption succeeds OR if it is a brand new vault with no backup yet
    if (res.success || res.message.includes('No cloud backup found')) {
      // 2. Lock PIN into active RAM (will vanish the second you hit refresh)
      setSessionPin(pin);
      setUnlocked(true);
      setError('');
    } else {
      setError('Invalid PIN. Decryption failed.');
      setPin('');
    }
  };

  // If unlocked, render the Web OS Desktop
  if (unlocked) {
    return <>{children}</>;
  }

  // Otherwise, render the minimalist Zero-Knowledge Lockscreen
  return (
    <div className="h-screen w-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-slate-200 font-sans selection:bg-cyan-500/30 p-4">
      <div className="max-w-xs w-full space-y-6 text-center animate-fade-in">
        
        {/* Minimalist OS Identity */}
        <div className="space-y-2">
          <div className="w-9 h-9 bg-slate-900/80 border border-slate-800 rounded-xl mx-auto flex items-center justify-center shadow-inner">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-300">
            System Locked
          </h1>
          <p className="text-[11px] text-slate-500 font-mono">
            Zero-Knowledge AES-256 Encryption
          </p>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleUnlock} className="space-y-3">
          <div className="relative">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full bg-[#131316] border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-center text-lg tracking-widest text-white placeholder-slate-600 focus:outline-none font-mono transition-all shadow-2xl"
            />
          </div>

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white rounded-xl text-xs font-mono transition-all border border-slate-700/60 shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Decrypting Vault...
              </span>
            ) : (
              <span>Unlock & Hydrate →</span>
            )}
          </button>
        </form>

        {/* Status / Error Display */}
        {error && (
          <div className="text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-900/40 py-2 px-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Security Footer Note */}
        <div className="pt-4 border-t border-slate-900">
          <p className="text-[10px] font-mono text-slate-600">
            RAM Wipe Active: Refreshing page relocks OS.
          </p>
        </div>

      </div>
    </div>
  );
}
