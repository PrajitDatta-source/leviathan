import { commandRegistry } from "./registry";
import { openWindow } from "@/core/window/manager";
import { CommandContext } from "./types";

export function registerBuiltinCommands() {
  commandRegistry.register({
    id: "settings",
    title: "Open Settings",
    description: "Open Iris settings",
    category: "System",
    keywords: ["preferences", "config"],

    run: () => {
      openWindow("settings");
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