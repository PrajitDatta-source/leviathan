"use client";

import { useEffect, useState } from "react";

export function Header() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    update();

    const interval = setInterval(update, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-md px-6 py-2.5 text-[var(--text)] select-none z-30">
      <h1 className="text-sm font-bold tracking-widest text-[var(--text)]">
        IRIS
      </h1>

      <span className="text-xs text-[var(--muted)]">{time}</span>
    </header>
  );
}