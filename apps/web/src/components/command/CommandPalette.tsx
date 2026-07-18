"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { commandRegistry } from "@/core/command";
import { useState, useMemo } from "react";
import { useWindowManager } from "@/core/window/hooks";
import { useTheme } from "@/modules/theme/ThemeContext";

import { appRegistry } from "@/core/app";
import { vfs } from "@/modules/filesystem/vfs";
import { createElement } from "react";
import { NotesWindow } from "@/apps/notes/NotesWindow";
import { ExplorerWindow } from "@/apps/explorer/ExplorerWindow";
import { SettingsWindow } from "@/apps/settings/SettingsWindow";

// Safe fuzzy search implementation
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  let queryIndex = 0;
  let textIndex = 0;
  
  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      queryIndex++;
    }
    textIndex++;
  }
  
  return queryIndex === queryLower.length;
}

function calculateScore(text: string, query: string): number {
  if (!query) return 0;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 80;
  
  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 60;
  
  // Fuzzy match gets lower score
  if (fuzzyMatch(text, query)) return 40;
  
  return 0;
}

// Safe math evaluator helper
function evaluateMath(expression: string): number | null {
  const clean = expression.replace(/\s+/g, "");
  if (!/^[0-9+\-*/().]+$/.test(clean)) {
    return null;
  }
  // Require at least one math operator to identify math input
  if (!/[+\-*/]/.test(clean)) {
    return null;
  }
  try {
    const result = new Function(`return ${clean}`)();
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch {
    // Ignore invalid syntax while typing
  }
  return null;
}

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const windowManager = useWindowManager();
  const themeContext = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allSearchItems = useMemo(() => {
    const list: any[] = [];

    // 1. Built-in Commands
    commandRegistry.getAll().forEach(cmd => {
      list.push({
        id: `cmd_${cmd.id}`,
        title: cmd.title,
        description: cmd.description,
        category: "System Commands",
        keywords: cmd.keywords,
        run: (ctx: any) => cmd.run(ctx),
      });
    });

    // 2. Applications
    appRegistry.getAll().forEach(app => {
      list.push({
        id: `app_${app.id}`,
        title: app.title,
        description: `Launch ${app.title} Application`,
        category: "Applications",
        keywords: [app.id, app.title, "open", "launch"],
        run: (ctx: any) => {
          ctx.windowManager.open({
            id: app.id,
            title: app.title,
            content: createElement(app.component),
            width: app.width || 700,
            height: app.height || 500,
          });
        },
      });
    });

    // 3. VFS Files & Folders
    vfs.getAllNodes().forEach(node => {
      list.push({
        id: `vfs_${node.id}`,
        title: node.name,
        description: `${node.type === "folder" ? "Directory folder" : "Markdown text file"} in virtual workspace`,
        category: "Files & Folders",
        keywords: [node.name, node.type],
        run: (ctx: any) => {
          if (node.name.endsWith(".md")) {
            ctx.windowManager.open({
              id: "notes",
              title: "Notes",
              content: createElement(NotesWindow),
              width: 800,
              height: 550,
            });
          } else {
            ctx.windowManager.open({
              id: "explorer",
              title: "File Explorer",
              content: createElement(ExplorerWindow),
              width: 800,
              height: 550,
            });
          }
        },
      });
    });

    // 4. Settings Shortcuts
    const settingsPanels = [
      { tab: "appearance", title: "Settings: Appearance", desc: "Choose system color themes & highlights" },
      { tab: "wallpaper", title: "Settings: Wallpaper", desc: "Select custom background mesh-gradients" },
      { tab: "system", title: "Settings: System Info", desc: "View environment configurations & kernels" },
    ];
    settingsPanels.forEach(panel => {
      list.push({
        id: `settings_${panel.tab}`,
        title: panel.title,
        description: panel.desc,
        category: "Settings Shortcuts",
        keywords: ["settings", panel.tab, "themes", "color", "wallpaper", "background"],
        run: (ctx: any) => {
          ctx.windowManager.open({
            id: "settings",
            title: "Settings",
            content: createElement(SettingsWindow),
            width: 700,
            height: 500,
          });
        },
      });
    });

    return list;
  }, []);

  const filteredCommands = useMemo(() => {
    if (!query) return allSearchItems.slice(0, 10);

    const scored = allSearchItems.map(item => {
      const titleScore = calculateScore(item.title, query);
      const descriptionScore = item.description 
        ? calculateScore(item.description, query)
        : 0;
      const categoryScore = item.category
        ? calculateScore(item.category, query)
        : 0;
      const keywordsScore = item.keywords
        ? Math.max(...item.keywords.map((k: string) => calculateScore(k, query)))
        : 0;

      const maxScore = Math.max(titleScore, descriptionScore, categoryScore, keywordsScore);
      
      return { item, score: maxScore };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.item);
  }, [query, allSearchItems]);

  // Real-time calculation parsing
  const mathResult = useMemo(() => evaluateMath(query), [query]);

  // Prepend calculation result command if math expression is parsed
  const finalCommands = useMemo(() => {
    const list = [...filteredCommands];
    if (mathResult !== null) {
      list.unshift({
        id: "calculator_result",
        title: `= ${mathResult}`,
        description: "Copy calculation result to clipboard",
        category: "Calculator",
        run: () => {
          if (typeof window !== "undefined") {
            navigator.clipboard.writeText(String(mathResult));
            alert(`Copied ${mathResult} to clipboard!`);
          }
        }
      } as any);
    }
    return list;
  }, [filteredCommands, mathResult]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < finalCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (finalCommands[selectedIndex]) {
        finalCommands[selectedIndex].run({ windowManager, themeContext });
        onOpenChange(false);
      }
    }
  };

  const handleCommandClick = (command: any, index: number) => {
    command.run({ windowManager, themeContext });
    onOpenChange(false);
  };

  // Reset selection when query changes
  useMemo(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        if (!newOpen) {
          setQuery("");
          setSelectedIndex(0);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-24 w-[650px] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl text-[var(--text)]">

          <input
            autoFocus
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border-b border-[var(--border)] bg-transparent pb-3 text-lg outline-none text-[var(--text)]"
          />

          <div className="mt-4 space-y-1 max-h-[400px] overflow-y-auto">

            {finalCommands.length === 0 ? (
              <div className="p-3 text-center text-[var(--muted)]">
                No commands found
              </div>
            ) : (
              finalCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleCommandClick(command, index)}
                  className={`
                    flex w-full flex-col rounded-lg p-3 text-left transition
                    ${index === selectedIndex ? "bg-[var(--border)]" : "hover:bg-[var(--border)]/50"}
                  `}
                >
                  <span className="font-medium">
                    {command.title}
                  </span>

                  {command.description && (
                    <span className="text-sm text-[var(--muted)]">
                      {command.description}
                    </span>
                  )}

                  {command.category && (
                    <span className="text-xs text-[var(--muted)]/80 mt-1">
                      {command.category}
                    </span>
                  )}
                </button>
              ))
            )}

          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)]/80 flex justify-between">
            <span>↑↓ to navigate</span>
            <span>Enter to select</span>
            <span>Esc to close</span>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}