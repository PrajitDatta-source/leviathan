import { vfs } from "@/modules/filesystem/vfs";

export interface CommandResult {
  output: string;
  clear?: boolean;
  error?: boolean;
}

class CommandServiceClass {
  private currentDirId: string | null = null;

  getCurrentDirId(): string | null {
    return this.currentDirId;
  }

  setCurrentDirId(id: string | null): void {
    this.currentDirId = id;
  }

  getPromptPath(): string {
    if (!this.currentDirId) return "~";
    const pathNodes = vfs.getPath(this.currentDirId);
    return "~/" + pathNodes.map((n) => n.name).join("/");
  }

  resolvePath(pathStr: string): string | null | undefined {
    let cleanPath = pathStr.trim();
    if (!cleanPath || cleanPath === "~" || cleanPath === "/") {
      return null;
    }

    const parts = cleanPath.split("/").filter((p) => p !== "");
    let startNodeId: string | null = this.currentDirId;

    if (cleanPath.startsWith("~") || cleanPath.startsWith("/")) {
      startNodeId = null;
      if (parts[0] === "~") {
        parts.shift();
      }
    }

    let currentId = startNodeId;
    for (const part of parts) {
      if (part === "..") {
        if (currentId) {
          const node = vfs.getNode(currentId);
          currentId = node ? node.parentId : null;
        } else {
          currentId = null;
        }
      } else if (part === ".") {
        // stay in current directory
      } else {
        const children = vfs.getChildren(currentId);
        const next = children.find((c) => c.name === part && c.type === "folder");
        if (!next) {
          return undefined; // Directory not found
        }
        currentId = next.id;
      }
    }
    return currentId;
  }

  execute(commandLine: string): CommandResult {
    const rawCommand = commandLine.trim();
    if (!rawCommand) {
      return { output: "" };
    }

    // Check for redirection syntax
    const redirectIndex = rawCommand.indexOf(">");
    if (redirectIndex !== -1) {
      const leftPart = rawCommand.substring(0, redirectIndex).trim();
      const rightPart = rawCommand.substring(redirectIndex + 1).trim();

      if (leftPart.startsWith("echo")) {
        let text = leftPart.substring(4).trim();
        if (text.startsWith('"') && text.endsWith('"')) {
          text = text.slice(1, -1);
        } else if (text.startsWith("'") && text.endsWith("'")) {
          text = text.slice(1, -1);
        }

        const filename = rightPart;
        if (!filename) {
          return { output: "echo: missing destination file name after '>'", error: true };
        }

        const children = vfs.getChildren(this.currentDirId);
        const file = children.find((c) => c.name === filename && c.type === "file");
        if (file) {
          vfs.updateFileContent(file.id, text);
        } else {
          vfs.createFile(filename, this.currentDirId, text);
        }
        return { output: "" };
      }
    }

    const parts = rawCommand.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
        return {
          output: [
            "Available UNIX-style commands:",
            "  help              - Display this list of commands",
            "  clear             - Clear the screen",
            "  ls                - List files and directories in the current folder",
            "  cd <path>         - Change current working directory",
            "  mkdir <name>      - Create a new directory",
            "  touch <name>      - Create a new empty file",
            "  cat <name>        - Display the contents of a file",
            "  echo <text> > <f> - Write or overwrite a file with text"
          ].join("\n")
        };

      case "clear":
        return { output: "", clear: true };

      case "ls": {
        const children = vfs.getChildren(this.currentDirId);
        if (children.length === 0) {
          return { output: "" };
        }
        return {
          output: children
            .map((c) => `${c.type === "folder" ? "📁" : "📄"} ${c.name}`)
            .join("\n")
        };
      }

      case "cd": {
        const pathArg = args.join(" ");
        const nextId = this.resolvePath(pathArg);
        if (nextId === undefined) {
          return { output: `cd: no such directory: ${pathArg}`, error: true };
        }
        this.currentDirId = nextId;
        return { output: "" };
      }

      case "mkdir": {
        const folderName = args.join(" ");
        if (!folderName) {
          return { output: "mkdir: missing directory name", error: true };
        }
        vfs.createFolder(folderName, this.currentDirId);
        return { output: "" };
      }

      case "touch": {
        const fileName = args.join(" ");
        if (!fileName) {
          return { output: "touch: missing file name", error: true };
        }
        vfs.createFile(fileName, this.currentDirId, "");
        return { output: "" };
      }

      case "cat": {
        const fileName = args.join(" ");
        if (!fileName) {
          return { output: "cat: missing file name", error: true };
        }
        const children = vfs.getChildren(this.currentDirId);
        const file = children.find((c) => c.name === fileName && c.type === "file");
        if (!file) {
          return { output: `cat: ${fileName}: No such file`, error: true };
        }
        return { output: file.content || "" };
      }

      case "neofetch": {
        const vfsCount = vfs.getAllNodes().length;
        return {
          output: [
            "    /\\_/\\      user@iris",
            "   ( o.o )     --------------",
            "    > ^ <      OS: Iris Web OS v1.0.0",
            "   /  |  \\     Resolution: 1920x1080",
            "  ( |_|_| )    VFS Nodes: " + vfsCount + " files/folders"
          ].join("\n")
        };
      }

      case "theme": {
        const themeName = args.join(" ");
        if (!themeName) {
          return { output: "Usage: theme <iris-light | iris-dark | oled | glass | etc.>" };
        }
        return { output: `Theme change triggered for: ${themeName} (simulation)` };
      }

      case "weather": {
        return { output: "⛅ Clear sky, +22°C (London)" };
      }

      default:
        return { output: `bash: command not found: ${cmd}`, error: true };
    }
  }

  getAutoComplete(partialName: string): string[] {
    const children = vfs.getChildren(this.currentDirId);
    return children
      .filter((c) => c.name.toLowerCase().startsWith(partialName.toLowerCase()))
      .map((c) => c.name);
  }
}

export const CommandService = new CommandServiceClass();
