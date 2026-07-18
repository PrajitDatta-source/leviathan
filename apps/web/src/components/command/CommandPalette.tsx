"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { commandRegistry } from "@/core/command";
import { useState, useMemo } from "react";
import { useWindowManager } from "@/core/window/hooks";


type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Simple fuzzy search implementation
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

export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const windowManager = useWindowManager();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allCommands = commandRegistry.getAll();

  const filteredCommands = useMemo(() => {
    if (!query) return allCommands;

    const scored = allCommands.map(command => {
      const titleScore = calculateScore(command.title, query);
      const descriptionScore = command.description 
        ? calculateScore(command.description, query)
        : 0;
      const categoryScore = command.category
        ? calculateScore(command.category, query)
        : 0;
      const keywordsScore = command.keywords
        ? Math.max(...command.keywords.map(k => calculateScore(k, query)))
        : 0;

      const maxScore = Math.max(titleScore, descriptionScore, categoryScore, keywordsScore);
      
      return { command, score: maxScore };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.command);
  }, [query, allCommands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].run({ windowManager });
        onOpenChange(false);
      }
    }
  };

  const handleCommandClick = (command: any, index: number) => {
    command.run({ windowManager });
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

        <Dialog.Content className="fixed left-1/2 top-24 w-[650px] -translate-x-1/2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">

          <input
            autoFocus
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border-b border-zinc-800 bg-transparent pb-3 text-lg outline-none"
          />

          <div className="mt-4 space-y-1 max-h-[400px] overflow-y-auto">

            {filteredCommands.length === 0 ? (
              <div className="p-3 text-center text-zinc-400">
                No commands found
              </div>
            ) : (
              filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleCommandClick(command, index)}
                  className={`
                    flex w-full flex-col rounded-lg p-3 text-left transition
                    ${index === selectedIndex ? "bg-zinc-800" : "hover:bg-zinc-800"}
                  `}
                >
                  <span className="font-medium">
                    {command.title}
                  </span>

                  {command.description && (
                    <span className="text-sm text-zinc-400">
                      {command.description}
                    </span>
                  )}

                  {command.category && (
                    <span className="text-xs text-zinc-500 mt-1">
                      {command.category}
                    </span>
                  )}
                </button>
              ))
            )}

          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between">
            <span>↑↓ to navigate</span>
            <span>Enter to select</span>
            <span>Esc to close</span>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}