import { commandRegistry } from "./registry";
import { appRegistry } from "../app";
import { useWindowManager } from "../window/hooks";
import { createElement } from "react";

export function registerBuiltinCommands() {
  commandRegistry.register({
    id: "settings",
    title: "Open Settings",
    description: "Open Leviathan settings",
    category: "System",
    keywords: ["preferences", "config"],

    run: () => {
      const app = appRegistry.get("settings");
      if (!app) {
        console.error("Settings app not found");
        return;
      }

      const manager = useWindowManager();
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
    description: "Switch between dark and light theme",
    category: "Appearance",
    keywords: ["dark", "light"],

    run: () => {
      console.log("Toggle Theme");
    },
  });

  commandRegistry.register({
    id: "clock",
    title: "Show Clock",
    description: "Display current time",
    category: "Utilities",

    run: () => {
      alert(new Date().toLocaleTimeString());
    },
  });
}