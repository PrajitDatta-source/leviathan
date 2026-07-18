import { commandRegistry } from "./registry";

export function registerBuiltinCommands() {
  commandRegistry.register({
    id: "settings",
    title: "Open Settings",
    description: "Open Leviathan settings",
    category: "System",
    keywords: ["preferences", "config"],

    run: () => {
      alert("Settings window coming next 🚀");
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