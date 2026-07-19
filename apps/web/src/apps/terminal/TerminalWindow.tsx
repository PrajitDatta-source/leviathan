"use client";

import React, { useState, useEffect, useRef } from "react";
import { CommandService } from "@/core/services/CommandService";

interface ConsoleLine {
  type: "input" | "output" | "error" | "system";
  text: string;
  dirPath?: string;
}

export function TerminalWindow() {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lines, setLines] = useState<ConsoleLine[]>([
    { type: "system", text: "Iris Shell v1.0.0 (xterm-reactive)" },
    { type: "system", text: "Type 'help' to see available commands." },
  ]);
  const [inputVal, setInputVal] = useState("");
  
  const bufferRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    focusInput();
  }, []);

  // Scroll output buffer to bottom on new line appends
  useEffect(() => {
    if (bufferRef.current) {
      bufferRef.current.scrollTop = bufferRef.current.scrollHeight;
    }
  }, [lines]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const command = inputVal.trim();
      const currentPromptPath = CommandService.getPromptPath();

      setLines((prev) => [...prev, { type: "input", text: inputVal, dirPath: currentPromptPath }]);

      if (command) {
        const result = CommandService.execute(command);
        
        setHistory((prev) => [...prev, command]);
        setHistoryIndex(-1);

        if (result.clear) {
          setLines([]);
        } else if (result.output) {
          setLines((prev) => [
            ...prev,
            {
              type: result.error ? "error" : "output",
              text: result.output,
            },
          ]);
        }
      }

      setInputVal("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const globalHistory = CommandService.getHistory();
      if (globalHistory.length === 0) return;
      const newIdx = historyIndex === -1 ? globalHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIdx);
      setInputVal(globalHistory[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const globalHistory = CommandService.getHistory();
      if (historyIndex === -1) return;
      const newIdx = historyIndex + 1;
      if (newIdx >= globalHistory.length) {
        setHistoryIndex(-1);
        setInputVal("");
      } else {
        setHistoryIndex(newIdx);
        setInputVal(globalHistory[newIdx]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const words = inputVal.split(" ");
      const lastWord = words[words.length - 1] || "";

      if (words.length <= 1) {
        const cmds = ["help", "clear", "ls", "cd", "mkdir", "touch", "cat"];
        const matches = cmds.filter((c) => c.startsWith(lastWord.toLowerCase()));
        if (matches.length === 1) {
          words[0] = matches[0];
          setInputVal(words.join(" ") + " ");
        } else if (matches.length > 1) {
          setLines((prev) => [...prev, { type: "system", text: matches.join("   ") }]);
        }
      } else {
        const matches = CommandService.getAutoComplete(lastWord);
        if (matches.length === 1) {
          words[words.length - 1] = matches[0];
          setInputVal(words.join(" "));
        } else if (matches.length > 1) {
          setLines((prev) => [...prev, { type: "system", text: matches.join("   ") }]);
        }
      }
    }
  };

  return (
    <div 
      onClick={focusInput}
      className="flex flex-col h-full w-full bg-[#030303] text-zinc-300 font-mono text-xs p-4 select-text cursor-text overflow-hidden"
    >
      {/* Output buffer area */}
      <div 
        ref={bufferRef}
        className="flex-1 overflow-y-auto mb-2 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {lines.map((line, idx) => {
          if (line.type === "input") {
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">iris@desktop</span>
                <span className="text-zinc-500">:</span>
                <span className="text-cyan-400 font-bold">{line.dirPath || "~"}</span>
                <span className="text-zinc-400">$</span>
                <span className="text-zinc-100 font-medium pl-1">{line.text}</span>
              </div>
            );
          }

          let lineClass = "whitespace-pre-wrap leading-relaxed";
          if (line.type === "error") {
            lineClass += " text-rose-500 font-medium";
          } else if (line.type === "system") {
            lineClass += " text-violet-400 font-bold";
          } else {
            lineClass += " text-zinc-300";
          }

          return (
            <div key={idx} className={lineClass}>
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Prompt Accents & Input bar */}
      <div className="flex items-center gap-1.5 shrink-0 border-t border-zinc-900 pt-2.5 bg-[#030303]">
        <span className="text-emerald-400 font-bold">iris@desktop</span>
        <span className="text-zinc-500">:</span>
        <span className="text-cyan-400 font-bold">{CommandService.getPromptPath()}</span>
        <span className="text-zinc-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none text-zinc-100 outline-none pl-1 font-mono font-medium"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
