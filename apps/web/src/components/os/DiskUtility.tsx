'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  getVaultTelemetry, 
  nukeCloudVault, 
  pushStateToCloud, 
  HARDCODED_PIN, 
  downloadOfflineBackup, 
  restoreOfflineBackup 
} from '@/lib/vault';

export default function DiskUtility() {
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    setLoading(true);
    const stats = await getVaultTelemetry();
    setTelemetry(stats);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleForceSync = async () => {
    setStatus('Syncing...');
    const res = await pushStateToCloud(HARDCODED_PIN);
    setStatus(res.message);
    await loadStats();
    setTimeout(() => setStatus(''), 3000);
  };

  const handleDownloadBackup = async () => {
    setStatus('Preparing offline backup download...');
    await downloadOfflineBackup();
    setStatus('Backup downloaded successfully!');
    setTimeout(() => setStatus(''), 3000);
  };

  const handleFileRestoreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('Restoring offline backup file...');
    const res = await restoreOfflineBackup(file);
    setStatus(res.message);
    await loadStats();
  };

  const handleNuke = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setStatus('Destroying vault...');
    const res = await nukeCloudVault();
    if (res.success) {
      window.location.reload(); // Enforces RAM wipe and kicks to Lockscreen
    } else {
      setStatus(res.message);
    }
  };

  // Parse VFS file count if present
  let fileCount = 0;
  if (telemetry?.decryptedState?.vfs) {
    try {
      const vfsObj = JSON.parse(telemetry.decryptedState.vfs);
      fileCount = Array.isArray(vfsObj) ? vfsObj.length : Object.keys(vfsObj).length;
    } catch (e) {}
  }

  return (
    <div className="p-5 bg-[#121214] border border-slate-800 rounded-xl text-slate-200 font-mono text-xs max-w-xl w-full space-y-6 shadow-2xl">
      
      {/* Header & Quick Stats */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white uppercase">Disk & Vault Utility</h2>
          <p className="text-[11px] text-slate-500">Zero-Knowledge Storage Telemetry</p>
        </div>
        <button 
          onClick={loadStats} 
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition-colors cursor-pointer"
        >
          {loading ? 'Reading...' : 'Refresh'}
        </button>
      </div>

      {/* Storage Meter */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-400">Cloud Payload Footprint</span>
          <span className="text-cyan-400 font-bold">{telemetry?.formattedSize || '0 KB'}</span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${Math.min(((telemetry?.bytes || 0) / (1024 * 500)) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>0 KB</span>
          <span>500 KB (Recommended Soft Limit)</span>
        </div>
      </div>

      {/* Side-by-Side Proof of Encryption */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        
        {/* What Supabase Sees */}
        <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold">What Supabase Sees</div>
          <p className="text-[10px] text-slate-500">Raw AES-256 Ciphertext in DB:</p>
          <div className="p-2 bg-black/60 rounded border border-slate-900 h-24 overflow-hidden break-all text-[9px] text-slate-600 select-all">
            {telemetry?.rawData || 'No cloud data found.'}
          </div>
        </div>

        {/* What Iris Sees */}
        <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">What Iris Sees</div>
          <p className="text-[10px] text-slate-500">RAM Decrypted State:</p>
          <div className="p-2 bg-black/60 rounded border border-slate-900 h-24 overflow-y-auto space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">VFS Files:</span>
              <span className="text-white font-bold">{fileCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gmail Auth:</span>
              <span className={telemetry?.decryptedState?.gmailToken ? "text-emerald-400" : "text-slate-600"}>
                {telemetry?.decryptedState?.gmailToken ? "Linked" : "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Telegram Auth:</span>
              <span className={telemetry?.decryptedState?.telegramToken ? "text-emerald-400" : "text-slate-600"}>
                {telemetry?.decryptedState?.telegramToken ? "Linked" : "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Theme:</span>
              <span className="text-slate-300">{telemetry?.decryptedState?.theme || 'default'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Offline Backup Controls */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Offline Hard Drive Backups (.iris)</div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadBackup}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] transition-all cursor-pointer"
          >
            Download Backup (.iris)
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".iris" 
            onChange={handleFileRestoreChange} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] transition-all cursor-pointer"
          >
            Restore Backup File
          </button>
        </div>
      </div>

      {/* Action Controls & Clean Options */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleForceSync}
            className="px-3 py-2 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-800/50 rounded text-[11px] transition-all cursor-pointer"
          >
            Force Cloud Push
          </button>
        </div>

        <button
          onClick={handleNuke}
          className={`px-3 py-2 rounded text-[11px] font-bold transition-all border cursor-pointer ${
            confirmDelete 
              ? 'bg-red-600 text-white border-red-500 animate-pulse' 
              : 'bg-red-950/30 text-red-400 border-red-900/50 hover:bg-red-900/40'
          }`}
        >
          {confirmDelete ? 'CLICK AGAIN TO CONFIRM WIPE' : 'Nuke Cloud Vault'}
        </button>
      </div>

      {status && (
        <div className="text-center p-2 bg-slate-900 border border-slate-800 rounded text-cyan-400 text-[11px]">
          {status}
        </div>
      )}

    </div>
  );
}
