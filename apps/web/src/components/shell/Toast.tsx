"use client";

import React, { useEffect, useState } from "react";

interface ToastDetail {
  message: string;
}

const TOAST_EVENT = "iris-toast";

/** Fire-and-forget helper: shows a small transient toast instead of a
 * jarring native `alert()`. Used for things like "Trash is empty" clicks
 * that don't warrant opening a whole window. */
export function showToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message } }));
}

/** Mount once near the root of the app (in AppShell). Listens for
 * `showToast()` calls and renders a small glass pill above the taskbar. */
export function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    let counter = 0;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      const id = ++counter;
      setToasts((prev) => [...prev, { id, message: detail.message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-16 left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-full border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl px-4 py-2 text-xs font-medium text-[var(--text)] shadow-lg animate-window-open"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
