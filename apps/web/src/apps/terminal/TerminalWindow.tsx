"use client";

import React, { useState, useEffect, useRef } from "react";
import { vfs } from "@/modules/filesystem/vfs";
import { useTheme } from "@/modules/theme/ThemeContext";
import { useWindowManager } from "@/core/window/hooks";
import type { Terminal as XTermTerminal } from "xterm";

export function TerminalWindow() {
  const { theme, setTheme } = useTheme();
  const manager = useWindowManager();
  const [currentDirId, setCurrentDirId] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTermTerminal | null>(null);

  // Sync ref with React state to let dynamic callbacks read the current dir synchronously
  const currentDirRef = useRef<string | null>(null);
  const cmdHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const themeRef = useRef<any>(theme);
  const setThemeRef = useRef<any>(setTheme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  // Set initial home directory pointer
  useEffect(() => {
    const rootFolders = vfs.getChildren(null);
    const homeFolder = rootFolders.find((n) => n.name === "Home");
    if (homeFolder) {
      setCurrentDirId(homeFolder.id);
      currentDirRef.current = homeFolder.id;
    }
  }, []);

  const getPromptPath = () => {
    const dirId = currentDirRef.current;
    if (!dirId) return "/";
    const pathNodes = vfs.getPath(dirId);
    return "/" + pathNodes.map((n) => n.name).join("/");
  };

  const writePrompt = (t: XTermTerminal) => {
    t.write(`\r\n\x1b[1;36mleviathan ➜ ${getPromptPath()} $\x1b[0m `);
  };

  const clearCurrentLineAndRedraw = (t: XTermTerminal, input: string) => {
    t.write("\r\x1b[2K");
    t.write(`\x1b[1;36mleviathan ➜ ${getPromptPath()} $\x1b[0m `);
    t.write(input);
  };

  const handleExecCommand = (commandLine: string, t: XTermTerminal) => {
    const command = commandLine.trim();
    if (!command) {
      writePrompt(t);
      return;
    }

    cmdHistoryRef.current.push(command);

    const parts = command.split(/\s+/);
    let cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === "dir") cmd = "ls";
    if (cmd === "cls") cmd = "clear";
    if (cmd === "md") cmd = "mkdir";

    switch (cmd) {
      case "help":
        t.writeln("\r\n\x1b[1;32mAvailable commands:\x1b[0m");
        t.writeln("  ls            - List contents of current directory");
        t.writeln("  cd [dir]      - Change directory (e.g. 'cd Documents', 'cd ..')");
        t.writeln("  mkdir [name]  - Create new directory");
        t.writeln("  rm [name]     - Delete file or directory");
        t.writeln("  cat [file]    - Display file contents");
        t.writeln("  theme [name]  - Set theme (light, dark, oled, glass)");
        t.writeln("  weather       - Fetch weather information");
        t.writeln("  neofetch      - Display system details");
        t.writeln("  clear         - Clear terminal screen");
        writePrompt(t);
        break;

      case "clear":
        t.clear();
        writePrompt(t);
        break;

      case "ls":
        t.writeln("");
        const nodes = vfs.getChildren(currentDirRef.current);
        if (nodes.length === 0) {
          t.writeln("(empty directory)");
        } else {
          nodes.forEach((n) => {
            const prefix = n.type === "folder" ? "📁 " : "📄 ";
            t.writeln(`${prefix}${n.name}`);
          });
        }
        writePrompt(t);
        break;

      case "cd":
        t.writeln("");
        const target = args.join(" ");
        if (!target) {
          const rootFolders = vfs.getChildren(null);
          const home = rootFolders.find((n) => n.name === "Home");
          if (home) {
            currentDirRef.current = home.id;
            setCurrentDirId(home.id);
          }
        } else if (target === "..") {
          if (currentDirRef.current) {
            const node = vfs.getNode(currentDirRef.current);
            if (node && node.parentId) {
              currentDirRef.current = node.parentId;
              setCurrentDirId(node.parentId);
            }
          }
        } else {
          const children = vfs.getChildren(currentDirRef.current);
          const folder = children.find((n) => n.name === target && n.type === "folder");
          if (folder) {
            currentDirRef.current = folder.id;
            setCurrentDirId(folder.id);
          } else {
            t.writeln(`cd: no such directory: ${target}`);
          }
        }
        writePrompt(t);
        break;

      case "mkdir":
        t.writeln("");
        const folderName = args.join(" ");
        if (!folderName) {
          t.writeln("mkdir: missing directory name");
        } else {
          vfs.createFolder(folderName, currentDirRef.current);
          t.writeln(`Directory '${folderName}' created successfully.`);
        }
        writePrompt(t);
        break;

      case "rm":
        t.writeln("");
        const removeName = args.join(" ");
        if (!removeName) {
          t.writeln("rm: missing node name");
        } else {
          const children = vfs.getChildren(currentDirRef.current);
          const node = children.find((n) => n.name === removeName);
          if (node) {
            vfs.deleteNode(node.id);
            t.writeln(`'${removeName}' removed successfully.`);
          } else {
            t.writeln(`rm: no such file or directory: ${removeName}`);
          }
        }
        writePrompt(t);
        break;

      case "cat":
        t.writeln("");
        const fileName = args.join(" ");
        if (!fileName) {
          t.writeln("cat: missing file name");
        } else {
          const children = vfs.getChildren(currentDirRef.current);
          const file = children.find((n) => n.name === fileName && n.type === "file");
          if (file) {
            const cleanContent = (file.content || "(empty file)").replace(/\n/g, "\r\n");
            t.writeln(cleanContent);
          } else {
            t.writeln(`cat: no such file: ${fileName}`);
          }
        }
        writePrompt(t);
        break;

      case "theme":
        t.writeln("");
        const targetTheme = args[0]?.toLowerCase();
        if (["light", "dark", "oled", "glass"].includes(targetTheme)) {
          setThemeRef.current(targetTheme as any);
          t.writeln(`Theme switched to '${targetTheme}'`);
        } else {
          t.writeln(`theme: theme '${targetTheme || ""}' not found. Try: light, dark, oled, glass`);
        }
        writePrompt(t);
        break;

      case "weather":
        t.writeln("\r\nFetching Forecast...");
        (async () => {
          try {
            let lat = 51.5074;
            let lon = -0.1278;
            let locName = "London (Default)";
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
              t.writeln(`🌤️  Forecast (${locName}): ${text}, ${temp}°C, Wind ${wind} km/h`);
            }
          } catch (e) {
            t.writeln("weather: failed to reach weather API.");
          }
          writePrompt(t);
        })();
        break;

      case "neofetch": {
        const res = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "1920x1080";
        const uptime = Math.round(performance.now() / 1000);
        const openWinCount = manager.windows.length;
        const vfsCount = vfs.getAllNodes().length;
        
        t.writeln("");
        t.writeln("    /\\_/\\      user@leviathan");
        t.writeln("   ( o.o )     --------------");
        t.writeln("    > ^ <      OS: Leviathan Web OS v1.0.0");
        t.writeln("   /  |  \\     Resolution: " + res);
        t.writeln("  ( |_|_| )    Uptime: " + uptime + "s");
        t.writeln("               Active Workspace: Workspace " + manager.activeWorkspace);
        t.writeln("               Theme: " + themeRef.current.toUpperCase());
        t.writeln("               VFS Nodes: " + vfsCount + " files/folders");
        writePrompt(t);
        break;
      }

      default:
        t.writeln(`\r\nbash: command not found: ${cmd}`);
        writePrompt(t);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !terminalRef.current) return;

    // Load xterm stylesheet dynamically
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css";
    document.head.appendChild(link);

    let isMounted = true;
    let terminal: XTermTerminal;

    // Load xterm dynamically
    import("xterm").then(({ Terminal }) => {
      if (!isMounted) return;

      terminal = new Terminal({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
        theme: {
          background: "#09090b",
          foreground: "#f4f4f5",
          cursor: "#a78bfa",
          selectionBackground: "rgba(167, 139, 250, 0.3)",
        },
      });

      if (!terminalRef.current) return;
      xtermInstance.current = terminal;
      terminal.open(terminalRef.current);
      
      // Compute initial fit size
      const containerWidth = terminalRef.current.clientWidth;
      const containerHeight = terminalRef.current.clientHeight;
      const cols = Math.max(40, Math.floor(containerWidth / 7.5));
      const rows = Math.max(10, Math.floor(containerHeight / 17));
      terminal.resize(cols, rows);

      // Welcome header
      terminal.writeln("Leviathan Shell v1.0.0 (xterm.js)");
      terminal.writeln("Type 'help' to see available commands.");
      terminal.write(`\x1b[1;36mleviathan ➜ ${getPromptPath()} $\x1b[0m `);

      // Handle raw key presses and line buffer
      let inputBuffer = "";
      terminal.onData((data) => {
        // Up Arrow
        if (data === "\x1b[A") {
          const cmdHistory = cmdHistoryRef.current;
          if (cmdHistory.length === 0) return;
          const nextIndex = historyIndexRef.current === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndexRef.current - 1);
          historyIndexRef.current = nextIndex;
          inputBuffer = cmdHistory[nextIndex];
          clearCurrentLineAndRedraw(terminal, inputBuffer);
          return;
        }

        // Down Arrow
        if (data === "\x1b[B") {
          const cmdHistory = cmdHistoryRef.current;
          if (historyIndexRef.current === -1) return;
          const nextIndex = historyIndexRef.current + 1;
          if (nextIndex >= cmdHistory.length) {
            historyIndexRef.current = -1;
            inputBuffer = "";
          } else {
            historyIndexRef.current = nextIndex;
            inputBuffer = cmdHistory[nextIndex];
          }
          clearCurrentLineAndRedraw(terminal, inputBuffer);
          return;
        }

        // Left / Right Arrow block (for simple inline edits)
        if (data === "\x1b[C" || data === "\x1b[D") {
          return;
        }

        // Enter key
        if (data === "\r") {
          handleExecCommand(inputBuffer, terminal);
          inputBuffer = "";
          historyIndexRef.current = -1;
          return;
        }

        // Backspace key
        if (data === "\x7f" || data === "\x08") {
          if (inputBuffer.length > 0) {
            inputBuffer = inputBuffer.slice(0, -1);
            terminal.write("\b \b");
          }
          return;
        }

        // Ctrl+C cancellation
        if (data === "\x03") {
          terminal.write("^C");
          inputBuffer = "";
          writePrompt(terminal);
          return;
        }

        // Tab completion
        if (data === "\t") {
          const trimmed = inputBuffer.trim();
          const tokens = trimmed.split(/\s+/);
          const currentToken = tokens[tokens.length - 1] || "";
          
          if (tokens.length <= 1) {
            const commands = ["ls", "cd", "mkdir", "rm", "cat", "theme", "weather", "neofetch", "clear", "help"];
            const matches = commands.filter(c => c.startsWith(currentToken.toLowerCase()));
            if (matches.length === 1) {
              inputBuffer = matches[0] + " ";
              clearCurrentLineAndRedraw(terminal, inputBuffer);
            } else if (matches.length > 1) {
              terminal.write("\r\n" + matches.join("   "));
              clearCurrentLineAndRedraw(terminal, inputBuffer);
            }
          } else {
            const children = vfs.getChildren(currentDirRef.current);
            const matches = children
              .map(c => c.name)
              .filter(name => name.toLowerCase().startsWith(currentToken.toLowerCase()));
            
            if (matches.length === 1) {
              const isDir = children.find(c => c.name === matches[0])?.type === "folder";
              tokens[tokens.length - 1] = matches[0];
              inputBuffer = tokens.join(" ") + (isDir ? "/" : " ");
              clearCurrentLineAndRedraw(terminal, inputBuffer);
            } else if (matches.length > 1) {
              terminal.write("\r\n" + matches.join("   "));
              clearCurrentLineAndRedraw(terminal, inputBuffer);
            }
          }
          return;
        }

        // Append text
        inputBuffer += data;
        terminal.write(data);
      });
    });

    // Resize observer to handle dynamic fit sizing
    const resizeObserver = new ResizeObserver(() => {
      if (!xtermInstance.current || !terminalRef.current) return;
      const t = xtermInstance.current;
      const containerWidth = terminalRef.current.clientWidth;
      const containerHeight = terminalRef.current.clientHeight;
      const cols = Math.max(40, Math.floor(containerWidth / 7.5));
      const rows = Math.max(10, Math.floor(containerHeight / 17));
      t.resize(cols, rows);
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      isMounted = false;
      if (terminal) {
        terminal.dispose();
      }
      document.head.removeChild(link);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex h-full w-full bg-[#09090b] overflow-hidden p-2 text-zinc-100">
      <div 
        ref={terminalRef} 
        className="h-full w-full select-text" 
        style={{ outline: "none" }}
      />
    </div>
  );
}
