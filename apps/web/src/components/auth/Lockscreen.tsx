'use client';

import React, { useState, useEffect } from 'react';
import { hydrateStateFromCloud, setSessionPin, getSessionPin, checkVaultExists, createVault } from '@/lib/vault';
import { checkSupabaseConfig } from '@/lib/supabaseClient';

type Mode = 'checking' | 'create' | 'unlock';

export default function Lockscreen({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState<Mode>('checking');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState('');

  // Checks RAM on boot — automatically re-locked on every page refresh,
  // by design: that's what makes this an actual lock rather than a
  // one-time speed bump.
  useEffect(() => {
    if (getSessionPin()) {
      setUnlocked(true);
      return;
    }

    const status = checkSupabaseConfig();
    if (!status.ok) {
      setConfigError(status.reason || 'Supabase is not configured.');
      return;
    }

    checkVaultExists()
      .then((exists) => setMode(exists ? 'unlock' : 'create'))
      .catch((e) => setConfigError(e instanceof Error ? e.message : 'Failed to reach Supabase.'));
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError('');

    const result = await hydrateStateFromCloud(pin);
    setLoading(false);

    if (result.status === 'unlocked') {
      setUnlocked(true);
    } else if (result.status === 'wrong-pin') {
      setError('Wrong PIN.');
      setPin('');
    } else if (result.status === 'no-vault') {
      // Vault was deleted between the mount check and now — fall back to
      // create mode instead of showing a confusing error.
      setMode('create');
      setPin('');
    } else {
      setError(result.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('Use at least 4 characters.');
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setLoading(true);
    setError('');

    const result = await createVault(pin);
    setLoading(false);

    if (result.success) {
      setUnlocked(true);
    } else {
      setError(result.message);
    }
  };

  if (unlocked) return <>{children}</>;

  if (configError) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0c] flex items-center justify-center text-slate-200 font-mono p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-xs tracking-[0.25em] text-red-400 font-bold uppercase">Setup needed</div>
          <p className="text-xs text-slate-400 leading-relaxed">{configError}</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment, then reload.
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'checking') {
    return <div className="h-screen w-screen bg-[#0a0a0c]" />;
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0c] flex items-center justify-center text-slate-200 font-mono selection:bg-cyan-500/30">
      <form onSubmit={mode === 'create' ? handleCreate : handleUnlock} className="w-64 space-y-3 text-center">
        <div className="text-xs tracking-[0.25em] text-slate-400 font-bold uppercase select-none">
          IRIS OS
        </div>

        {mode === 'create' && (
          <p className="text-[11px] text-slate-500 leading-relaxed pb-1">
            First time here — choose a PIN. You'll need it to unlock Iris on every device you use, so keep it somewhere safe. There's no recovery if you forget it.
          </p>
        )}

        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder={mode === 'create' ? 'Choose a PIN' : '••••••••'}
          autoFocus
          className="w-full bg-[#121214] border border-slate-800 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-center text-white placeholder-slate-600 focus:outline-none tracking-widest text-sm transition-colors shadow-lg"
        />

        {mode === 'create' && (
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Confirm PIN"
            className="w-full bg-[#121214] border border-slate-800 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-center text-white placeholder-slate-600 focus:outline-none tracking-widest text-sm transition-colors shadow-lg"
          />
        )}

        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white rounded-lg text-xs transition-colors border border-slate-700/60 shadow"
        >
          {loading ? '...' : mode === 'create' ? 'CREATE VAULT' : 'UNLOCK'}
        </button>

        {error && <div className="text-[11px] text-red-400 pt-1">{error}</div>}
      </form>
    </div>
  );
}
