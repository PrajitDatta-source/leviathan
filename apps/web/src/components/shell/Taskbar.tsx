"use client";

import { useWindowManager } from "@/core/window/hooks";
import { appRegistry } from "@/core/app";
import { useEffect, useState, createElement } from "react";

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
      const app = appRegistry.get(appId);
      if (app) {
        manager.open({
          id: appId,
          title: app.title,
          content: createElement(app.component),
          x: 100 + windows.length * 25,
          y: 100 + windows.length * 25,
          width: app.width || 700,
          height: app.height || 500,
        });
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-[var(--surface)] border-t border-[var(--border)] backdrop-blur-md flex items-center px-4 gap-2 z-50 text-[var(--text)]">
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
                rounded-lg
                transition
                flex
                items-center
                gap-2
                text-sm
                font-medium
                ${isFocused ? "bg-[var(--border)]" : "hover:bg-[var(--border)]/40"}
              `}
              title={app.title}
            >
              <span>{app.title}</span>
              
              {/* Running indicator */}
              {isRunning && (
                <div
                  className={`
                    absolute
                    bottom-1
                    left-1/2
                    -translate-x-1/2
                    w-1
                    h-1
                    rounded-full
                    ${isMinimized ? "bg-[var(--muted)]" : "bg-violet-500"}
                  `}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Clock */}
      <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
        <div className="text-right">
          <div className="font-medium text-[var(--text)]">
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
