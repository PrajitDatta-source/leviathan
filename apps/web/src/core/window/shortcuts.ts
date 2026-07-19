// central keyboard shortcuts management for Leviathan

export interface KeyCombination {
  key: string; // e.g. "q", "d", "tab", "arrowleft", "1", "enter"
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean; // Windows/Command key (Super)
}

export interface ShortcutDefinition {
  id: string;
  name: string;
  category: string;
  default: KeyCombination;
}

export const SHORTCUT_DEFS: ShortcutDefinition[] = [
  { id: "close_window", name: "Close Focused Window", category: "Window Management", default: { key: "q", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "toggle_maximize", name: "Maximize / Restore Window", category: "Window Management", default: { key: " ", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "show_desktop", name: "Show / Hide Desktop", category: "Window Management", default: { key: "d", ctrl: false, shift: false, alt: false, meta: true } },
  
  { id: "next_window", name: "Focus Next Window", category: "Window Navigation", default: { key: "tab", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "prev_window", name: "Focus Previous Window", category: "Window Navigation", default: { key: "tab", ctrl: false, shift: true, alt: false, meta: true } },
  
  { id: "snap_left", name: "Snap Window Left", category: "Window Snapping", default: { key: "arrowleft", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "snap_right", name: "Snap Window Right", category: "Window Snapping", default: { key: "arrowright", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "snap_up", name: "Snap Window Up (Maximize)", category: "Window Snapping", default: { key: "arrowup", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "snap_down", name: "Snap Window Down (Restore/Minimize)", category: "Window Snapping", default: { key: "arrowdown", ctrl: false, shift: false, alt: false, meta: true } },
  
  { id: "move_left", name: "Move Window Left", category: "Window Movement", default: { key: "arrowleft", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_right", name: "Move Window Right", category: "Window Movement", default: { key: "arrowright", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_up", name: "Move Window Up", category: "Window Movement", default: { key: "arrowup", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_down", name: "Move Window Down", category: "Window Movement", default: { key: "arrowdown", ctrl: false, shift: true, alt: false, meta: true } },
  
  { id: "open_terminal", name: "Open Terminal", category: "Applications", default: { key: "enter", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "open_explorer", name: "Open File Explorer", category: "Applications", default: { key: "e", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "open_notes", name: "Open Notes", category: "Applications", default: { key: "n", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "open_settings", name: "Open Settings", category: "Applications", default: { key: "s", ctrl: false, shift: false, alt: false, meta: true } },
  
  // Workspaces
  { id: "workspace_1", name: "Switch to Workspace 1", category: "Workspaces", default: { key: "1", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_2", name: "Switch to Workspace 2", category: "Workspaces", default: { key: "2", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_3", name: "Switch to Workspace 3", category: "Workspaces", default: { key: "3", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_4", name: "Switch to Workspace 4", category: "Workspaces", default: { key: "4", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_5", name: "Switch to Workspace 5", category: "Workspaces", default: { key: "5", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_6", name: "Switch to Workspace 6", category: "Workspaces", default: { key: "6", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_7", name: "Switch to Workspace 7", category: "Workspaces", default: { key: "7", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_8", name: "Switch to Workspace 8", category: "Workspaces", default: { key: "8", ctrl: false, shift: false, alt: false, meta: true } },
  { id: "workspace_9", name: "Switch to Workspace 9", category: "Workspaces", default: { key: "9", ctrl: false, shift: false, alt: false, meta: true } },
  
  { id: "move_workspace_1", name: "Move Window to Workspace 1", category: "Workspaces", default: { key: "1", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_2", name: "Move Window to Workspace 2", category: "Workspaces", default: { key: "2", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_3", name: "Move Window to Workspace 3", category: "Workspaces", default: { key: "3", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_4", name: "Move Window to Workspace 4", category: "Workspaces", default: { key: "4", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_5", name: "Move Window to Workspace 5", category: "Workspaces", default: { key: "5", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_6", name: "Move Window to Workspace 6", category: "Workspaces", default: { key: "6", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_7", name: "Move Window to Workspace 7", category: "Workspaces", default: { key: "7", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_8", name: "Move Window to Workspace 8", category: "Workspaces", default: { key: "8", ctrl: false, shift: true, alt: false, meta: true } },
  { id: "move_workspace_9", name: "Move Window to Workspace 9", category: "Workspaces", default: { key: "9", ctrl: false, shift: true, alt: false, meta: true } },
];

export type GlobalModifier = "meta" | "alt" | "ctrl" | "custom";

export interface ShortcutsConfig {
  globalModifier: GlobalModifier;
  customBinds: Record<string, KeyCombination>;
}

export function loadShortcutsConfig(): ShortcutsConfig {
  if (typeof window === "undefined") {
    return { globalModifier: "meta", customBinds: {} };
  }
  const stored = localStorage.getItem("leviathan_shortcuts_config");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse shortcuts config", e);
    }
  }
  return { globalModifier: "meta", customBinds: {} };
}

export function saveShortcutsConfig(config: ShortcutsConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem("leviathan_shortcuts_config", JSON.stringify(config));
    window.dispatchEvent(new Event("shortcuts-changed"));
  }
}

export function getShortcutCombination(actionId: string, config: ShortcutsConfig): KeyCombination {
  // If there's an explicit custom bind, use it
  if (config.customBinds[actionId]) {
    return config.customBinds[actionId];
  }
  
  // Find default definition
  const def = SHORTCUT_DEFS.find(d => d.id === actionId);
  if (!def) {
    return { key: "", ctrl: false, shift: false, alt: false, meta: false };
  }

  // If the global modifier is not custom, map metaKey to the chosen modifier
  if (config.globalModifier !== "custom") {
    const isMeta = config.globalModifier === "meta";
    const isAlt = config.globalModifier === "alt";
    const isCtrl = config.globalModifier === "ctrl";

    const base = { ...def.default };
    if (base.meta) {
      base.meta = isMeta;
      base.alt = base.alt || isAlt;
      base.ctrl = base.ctrl || isCtrl;
    }
    return base;
  }

  return def.default;
}

export function formatKeyCombo(combo: KeyCombination): string {
  const parts: string[] = [];
  if (combo.meta) parts.push("Super");
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  
  let keyLabel = combo.key.toUpperCase();
  if (combo.key === " ") keyLabel = "Space";
  if (combo.key === "arrowleft") keyLabel = "←";
  if (combo.key === "arrowright") keyLabel = "→";
  if (combo.key === "arrowup") keyLabel = "↑";
  if (combo.key === "arrowdown") keyLabel = "↓";
  if (combo.key === "enter") keyLabel = "Enter";
  if (combo.key === "tab") keyLabel = "Tab";

  parts.push(keyLabel);
  return parts.join(" + ");
}

export function matchesEvent(combo: KeyCombination, e: KeyboardEvent): boolean {
  if (!combo.key) return false;
  
  // Check key value. Some keys like tab, space or arrows should be matched case insensitively
  const targetKey = combo.key.toLowerCase();
  const eventKey = e.key.toLowerCase();
  
  if (targetKey === " ") {
    if (eventKey !== " " && eventKey !== "spacebar") return false;
  } else if (targetKey !== eventKey) {
    return false;
  }

  // Modifiers must match exactly
  if (combo.ctrl !== e.ctrlKey) return false;
  if (combo.shift !== e.shiftKey) return false;
  if (combo.alt !== e.altKey) return false;
  if (combo.meta !== e.metaKey) return false;

  return true;
}
