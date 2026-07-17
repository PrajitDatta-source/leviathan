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
    <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
      <h1 className="text-lg font-bold tracking-widest">
        LEVIATHAN
      </h1>

      <span>{time}</span>
    </header>
  );
}