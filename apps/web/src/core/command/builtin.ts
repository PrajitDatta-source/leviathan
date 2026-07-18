import { commandRegistry } from "./registry";
import { appRegistry } from "../app";
import { createElement } from "react";
import { CommandContext } from "./types";

export function registerBuiltinCommands() {
  commandRegistry.register({
    id: "settings",
    title: "Open Settings",
    description: "Open Leviathan settings",
    category: "System",
    keywords: ["preferences", "config"],

    run: (context: CommandContext) => {
      const app = appRegistry.get("settings");
      if (!app) {
        console.error("Settings app not found");
        return;
      }

      const manager = context.windowManager;
      if (!manager) {
        console.error("WindowManager not found in command context");
        return;
      }

      manager.open({
        id: "settings",
        title: app.title,
        content: createElement(app.component),
        x: 100,
        y: 100,
        width: app.width || 700,
        height: app.height || 500,
      });
    },
  });

  commandRegistry.register({
    id: "theme",
    title: "Toggle Theme",
    description: "Cycle between dark, light, oled, and glass themes",
    category: "Appearance",
    keywords: ["dark", "light", "oled", "glass", "appearance"],

    run: (context: CommandContext) => {
      const themeCtx = context.themeContext;
      if (!themeCtx) {
        console.error("ThemeContext not found in command context");
        return;
      }
      
      const themes = ["dark", "light", "oled", "glass"] as const;
      const currentIndex = themes.indexOf(themeCtx.theme as any);
      const nextIndex = (currentIndex + 1) % themes.length;
      themeCtx.setTheme(themes[nextIndex]);
    },
  });

  commandRegistry.register({
    id: "clock",
    title: "Show Clock",
    description: "Display current time",
    category: "Utilities",

    run: () => {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      alert(`🕒 Current Time: ${time}`);
    },
  });
}