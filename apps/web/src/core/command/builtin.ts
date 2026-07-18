import { commandRegistry } from "./registry";

export function registerBuiltinCommands() {
  commandRegistry.register({
    id: "settings",
    title: "Open Settings",
    description: "Open application settings",
    category: "System",
    run: () => {
      console.log("Settings");
    },
  });

  commandRegistry.register({
    id: "theme",
    title: "Toggle Theme",
    description: "Switch between light and dark mode",
    category: "Appearance",
    run: () => {
      console.log("Theme");
    },
  });
}