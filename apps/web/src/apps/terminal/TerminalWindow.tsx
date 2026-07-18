"use client";

import React, { useState, useEffect, useRef } from "react";
import { vfs } from "@/modules/filesystem/vfs";
import { useTheme } from "@/modules/theme/ThemeContext";
import { useWindowManager } from "@/core/window/hooks";

interface LogLine {
  text: string;
  type: "input" | "output" | "error" | "success";
}

export function TerminalWindow() {
  const { theme, setTheme } = useTheme();
  const manager = useWindowManager();
  const [currentDirId, setCurrentDirId] = useState<string | null>(null);
  const [history, setHistory] = useState<LogLine[]>([
    { text: "Leviathan Shell v1.0.0", type: "success" },
    { text: "Type 'help' to see available commands.", type: "output" },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initialize directory node pointer to "Home" if found
  useEffect(() => {
    const rootFolders = vfs.getChildren(null);
    const homeFolder = rootFolders.find((n) => n.name === "Home");
    if (homeFolder) {
      setCurrentDirId(homeFolder.id);
    }
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const getPromptPath = () => {
    if (!currentDirId) return "/";
    const pathNodes = vfs.getPath(currentDirId);
    return "/" + pathNodes.map((n) => n.name).join("/");
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const command = input.trim();
    if (!command) return;

    setHistory((prev) => [...prev, { text: `leviathan ➜ ${getPromptPath()} $ ${command}`, type: "input" }]);
    setCmdHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setInput("");

    const parts = command.split(/\s+/);
    let cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Command Aliases
    if (cmd === "dir") cmd = "ls";
    if (cmd === "cls") cmd = "clear";
    if (cmd === "md") cmd = "mkdir";

    switch (cmd) {
      case "help":
        setHistory((prev) => [
          ...prev,
          { text: "Available commands:", type: "success" },
          { text: "  ls            - List contents of current directory", type: "output" },
          { text: "  cd [dir]      - Change directory (e.g. 'cd Documents', 'cd ..')", type: "output" },
          { text: "  mkdir [name]  - Create new directory", type: "output" },
          { text: "  rm [name]     - Delete file or directory", type: "output" },
          { text: "  cat [file]    - Display file contents", type: "output" },
          { text: "  theme [name]  - Set theme (light, dark, oled, glass)", type: "output" },
          { text: "  weather       - Fetch weather information", type: "output" },
          { text: "  neofetch      - Display system details", type: "output" },
          { text: "  clear         - Clear terminal screen", type: "output" },
        ]);
        break;

      case "clear":
        setHistory([]);
        break;

      case "ls":
        const nodes = vfs.getChildren(currentDirId);
        if (nodes.length === 0) {
          setHistory((prev) => [...prev, { text: "(empty directory)", type: "output" }]);
        } else {
          nodes.forEach((n) => {
            const prefix = n.type === "folder" ? "📁 " : "📄 ";
            setHistory((prev) => [...prev, { text: `${prefix}${n.name}`, type: "output" }]);
          });
        }
        break;

      case "cd":
        const target = args.join(" ");
        if (!target) {
          // Go to Root folder Home
          const rootFolders = vfs.getChildren(null);
          const home = rootFolders.find((n) => n.name === "Home");
          if (home) setCurrentDirId(home.id);
        } else if (target === "..") {
          if (currentDirId) {
            const node = vfs.getNode(currentDirId);
            if (node) setCurrentDirId(node.parentId);
          }
        } else {
          const children = vfs.getChildren(currentDirId);
          const folder = children.find((n) => n.name === target && n.type === "folder");
          if (folder) {
            setCurrentDirId(folder.id);
          } else {
            setHistory((prev) => [...prev, { text: `cd: no such directory: ${target}`, type: "error" }]);
          }
        }
        break;

      case "mkdir":
        const folderName = args.join(" ");
        if (!folderName) {
          setHistory((prev) => [...prev, { text: "mkdir: missing directory name", type: "error" }]);
        } else {
          vfs.createFolder(folderName, currentDirId);
          setHistory((prev) => [...prev, { text: `Directory '${folderName}' created successfully.`, type: "success" }]);
        }
        break;

      case "rm":
        const removeName = args.join(" ");
        if (!removeName) {
          setHistory((prev) => [...prev, { text: "rm: missing node name", type: "error" }]);
        } else {
          const children = vfs.getChildren(currentDirId);
          const node = children.find((n) => n.name === removeName);
          if (node) {
            vfs.deleteNode(node.id);
            setHistory((prev) => [...prev, { text: `'${removeName}' removed successfully.`, type: "success" }]);
          } else {
            setHistory((prev) => [...prev, { text: `rm: no such file or directory: ${removeName}`, type: "error" }]);
          }
        }
        break;

      case "cat":
        const fileName = args.join(" ");
        if (!fileName) {
          setHistory((prev) => [...prev, { text: "cat: missing file name", type: "error" }]);
        } else {
          const children = vfs.getChildren(currentDirId);
          const file = children.find((n) => n.name === fileName && n.type === "file");
          if (file) {
            setHistory((prev) => [...prev, { text: file.content || "(empty file)", type: "output" }]);
          } else {
            setHistory((prev) => [...prev, { text: `cat: no such file: ${fileName}`, type: "error" }]);
          }
        }
        break;

      case "theme":
        const targetTheme = args[0]?.toLowerCase();
        if (["light", "dark", "oled", "glass"].includes(targetTheme)) {
          setTheme(targetTheme as any);
          setHistory((prev) => [...prev, { text: `Theme switched to '${targetTheme}'`, type: "success" }]);
        } else {
          setHistory((prev) => [
            ...prev,
            { text: `theme: theme '${targetTheme || ""}' not found. Try: light, dark, oled, glass`, type: "error" },
          ]);
        }
        break;

      case "weather":
        setHistory((prev) => [...prev, { text: "Fetching live meteorological forecast...", type: "output" }]);
        (async () => {
          try {
            let lat = 51.5074;
            let lon = -0.1278;
            let locName = "London (Default)";
            
            if (typeof navigator !== "undefined" && navigator.geolocation) {
              await new Promise<void>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    lat = pos.coords.latitude;
                    lon = pos.coords.longitude;
                    locName = "Your Coordinates";
                    resolve();
                  },
                  () => resolve()
                );
              });
            }

            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await res.json();
            if (data && data.current_weather) {
              const temp = Math.round(data.current_weather.temperature);
              const wind = data.current_weather.windspeed;
              const code = data.current_weather.weathercode;
              
              let text = "Clear Sky";
              if (code >= 1 && code <= 3) text = "Partly Cloudy";
              else if (code >= 51 && code <= 67) text = "Rainy Showers";
              else if (code >= 71 && code <= 77) text = "Snowy Flurries";
              else if (code >= 80 && code <= 82) text = "Heavy Rain";
              else if (code >= 95) text = "Thunderstorm";

              setHistory((prev) => [
                ...prev,
                { text: `🌤️  Weather Forecast (${locName}):`, type: "success" },
                { text: `   Conditions: ${text}`, type: "output" },
                { text: `   Temperature: ${temp}°C`, type: "output" },
                { text: `   Wind Speed: ${wind} km/h`, type: "output" },
              ]);
            }
          } catch (e) {
            setHistory((prev) => [...prev, { text: "weather: failed to reach Open-Meteo services.", type: "error" }]);
          }
        })();
        break;

      case "neofetch": {
        let browserName = "Chrome";
        if (typeof navigator !== "undefined") {
          const ua = navigator.userAgent;
          if (ua.includes("Firefox")) browserName = "Firefox";
          else if (ua.includes("Safari") && !ua.includes("Chrome")) browserName = "Safari";
          else if (ua.includes("Edge")) browserName = "Edge";
        }
        
        const res = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "1920x1080";
        const uptime = Math.round(performance.now() / 1000);
        const openWinCount = manager.windows.length;
        const vfsCount = vfs.getAllNodes().length;

        setHistory((prev) => [
          ...prev,
          {
            text: `
    /\\_/\\      user@leviathan
   ( o.o )     --------------
    > ^ <      OS: Leviathan Web OS v1.0.0
   /  |  \\     Browser: ${browserName}
  ( |_|_| )    Resolution: ${res}
               Uptime: ${uptime}s
               Active Workspace: Workspace ${manager.activeWorkspace}
               Open Windows: ${openWinCount}
               Theme: ${theme.toUpperCase()}
               VFS Nodes: ${vfsCount} files/folders
               Connected Services: Telegram API, Open-Meteo Weather
`,
            type: "success",
          },
        ]);
        break;
      }

      default:
        setHistory((prev) => [
          ...prev,
          { text: `bash: command not found: ${cmd}`, type: "error" },
        ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(cmdHistory[nextIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= cmdHistory.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(nextIndex);
        setInput(cmdHistory[nextIndex]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const trimmed = input.trim();
      const tokens = trimmed.split(/\s+/);
      const currentToken = tokens[tokens.length - 1] || "";
      
      if (tokens.length <= 1) {
        const commands = ["ls", "cd", "mkdir", "rm", "cat", "theme", "weather", "neofetch", "clear", "help", "dir", "md", "cls"];
        const matches = commands.filter(c => c.startsWith(currentToken.toLowerCase()));
        if (matches.length === 1) {
          setInput(matches[0] + " ");
        } else if (matches.length > 1) {
          setHistory(prev => [...prev, { text: matches.join("   "), type: "output" }]);
        }
      } else {
        const children = vfs.getChildren(currentDirId);
        const matches = children
          .map(c => c.name)
          .filter(name => name.toLowerCase().startsWith(currentToken.toLowerCase()));
        
        if (matches.length === 1) {
          const isDir = children.find(c => c.name === matches[0])?.type === "folder";
          tokens[tokens.length - 1] = matches[0];
          setInput(tokens.join(" ") + (isDir ? "/" : " "));
        } else if (matches.length > 1) {
          setHistory(prev => [...prev, { text: matches.join("   "), type: "output" }]);
        }
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-black p-4 font-mono text-xs select-text overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {history.map((line, idx) => {
          let color = "text-zinc-200";
          if (line.type === "input") color = "text-violet-400 font-semibold";
          if (line.type === "error") color = "text-rose-400";
          if (line.type === "success") color = "text-emerald-400";

          return (
            <div key={idx} className={`${color} whitespace-pre-wrap`}>
              {line.text}
            </div>
          );
        })}
        <div ref={terminalEndRef} />
      </div>

      <form onSubmit={handleCommand} className="flex gap-2 border-t border-zinc-900 pt-3 mt-2 shrink-0">
        <span className="text-violet-400 font-semibold shrink-0">leviathan ➜ {getPromptPath()} $</span>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-zinc-100 outline-none select-text"
        />
      </form>
    </div>
  );
}
