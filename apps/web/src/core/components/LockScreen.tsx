'use client';

import React, { useState, useEffect } from 'react';

interface LockScreenProps {
  children: React.ReactNode;
}

export default function LockScreen({ children }: LockScreenProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [storedPin, setStoredPin] = useState('@@#:'); // Default boot PIN

  useEffect(() => {
    // Check local storage for custom PIN or active session
    const savedPin = localStorage.getItem('iris_master_pin') || '@@#:';
    const sessionActive = sessionStorage.getItem('iris_unlocked');
    setStoredPin(savedPin);
    if (sessionActive === 'true') {
      setIsLocked(false);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === storedPin) {
      sessionStorage.setItem('iris_unlocked', 'true');
      setIsLocked(false);
    } else {
      setError(true);
      setPasscode('');
      setTimeout(() => setError(false), 1500);
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-white select-none">
      <div className="flex flex-col items-center space-y-6 p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl max-w-sm w-full mx-4">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30 shadow-inner">
          <span className="text-2xl font-bold tracking-wider text-blue-400">OS</span>
        </div>
        
        <div className="text-center">
          <h1 className="text-xl font-medium tracking-tight">Iris System Locked</h1>
          <p className="text-xs text-slate-400 mt-1">Enter Master Passcode to mount desktop</p>
        </div>

        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="••••"
            maxLength={16}
            className={`w-full text-center tracking-widest text-lg py-2.5 px-4 rounded-xl bg-slate-950/80 border ${
              error ? 'border-red-500 text-red-400 animate-shake' : 'border-slate-700 text-white focus:border-blue-500'
            } outline-none transition-all`}
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            Unlock Desktop
          </button>
        </form>
      </div>
    </div>
  );
}
