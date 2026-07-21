'use client';

import React, { useState, useEffect } from 'react';

export default function SyncDot() {
  const [status, setStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  useEffect(() => {
    // Listen for custom sync events from our vault engine
    const handleSyncStart = () => setStatus('syncing');
    const handleSyncDone = () => setStatus('synced');
    const handleSyncError = () => setStatus('error');

    window.addEventListener('iris-sync-start', handleSyncStart);
    window.addEventListener('iris-sync-done', handleSyncDone);
    window.addEventListener('iris-sync-error', handleSyncError);

    return () => {
      window.removeEventListener('iris-sync-start', handleSyncStart);
      window.removeEventListener('iris-sync-done', handleSyncDone);
      window.removeEventListener('iris-sync-error', handleSyncError);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono select-none" title={`Vault Status: ${status.toUpperCase()}`}>
      <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
        status === 'synced' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
        status === 'syncing' ? 'bg-amber-400 animate-ping' :
        'bg-red-500 animate-pulse'
      }`} />
      <span className="text-slate-400 hidden sm:inline">
        {status === 'synced' ? 'SAVED' : status === 'syncing' ? 'SYNCING...' : 'ERROR'}
      </span>
    </div>
  );
}
