"use client";

import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";
import { useEffect, useState } from "react";

export function Taskbar() {
  const manager = useWindowManager();
  const windows = manager.windows;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allApps = appRegistry.getAll();
  const runningAppIds = windows.map(w => w.id);

  const handleAppClick = (appId: string) => {
    const window = windows.find(w => w.id === appId);
    if (window) {
      if (window.minimized) {
        manager.restore(appId);
      } else if (window.focused) {
        manager.minimize(appId);
      } else {
        manager.focus(appId);
      }
    } else {
      // App not running, could launch it here
      console.log(`Launch ${appId}`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-zinc-900 border-t border-zinc-700 flex items-center px-4 gap-2 z-50">
      {/* Pinned/Running Apps */}
      <div className="flex items-center gap-1 flex-1">
        {allApps.map((app) => {
          const isRunning = runningAppIds.includes(app.id);
          const window = windows.find(w => w.id === app.id);
          const isFocused = window?.focused;
          const isMinimized = window?.minimized;

          return (
            <button
              key={app.id}
              onClick={() => handleAppClick(app.id)}
              className={`
                relative
                px-3
                py-2
                rounded
                transition
                flex
                items-center
                gap-2
                ${isFocused ? "bg-zinc-700" : "hover:bg-zinc-800"}
              `}
              title={app.title}
            >
              <span className="text-sm font-medium">{app.title}</span>
              
              {/* Running indicator */}
              {isRunning && (
                <div
                  className={`
                    absolute
                    bottom-0
                    left-1/2
                    -translate-x-1/2
                    w-1
                    h-1
                    rounded-full
                    ${isMinimized ? "bg-zinc-500" : "bg-blue-500"}
                  `}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Clock */}
      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <div className="text-right">
          <div className="font-medium text-white">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-xs">
            {time.toLocaleDateString([], { month: "short", day: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}
