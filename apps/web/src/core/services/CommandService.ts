import { vfs, VFSNode } from "@/modules/filesystem/vfs";
import { openWindow } from "@/core/window/manager";

export interface CommandResult {
  output: string;
  clear?: boolean;
  error?: boolean;
}

class CommandServiceClass {
  private currentDirId: string | null = null;
  private history: string[] = [];

  getCurrentDirId(): string | null {
    return this.currentDirId;
  }

  setCurrentDirId(id: string | null): void {
    this.currentDirId = id;
  }

  getHistory(): string[] {
    return this.history;
  }

  getPromptPath(): string {
    if (!this.currentDirId) return "~";
    const pathNodes = vfs.getPath(this.currentDirId);
    return "~/" + pathNodes.map((n) => n.name).join("/");
  }

  resolvePathToNode(pathStr: string): { id: string | null; node?: VFSNode } | undefined {
    let cleanPath = pathStr.trim();
    if (!cleanPath || cleanPath === "~" || cleanPath === "/") {
      return { id: null };
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
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

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
        const next = children.find((c) => c.name === part);
        if (!next) {
          return undefined;
        }
        if (isLast) {
          return { id: next.id, node: next };
        }
        if (next.type !== "folder") {
          return undefined; // Can't traverse through a file
        }
        currentId = next.id;
      }
    }

    if (currentId === null) {
      return { id: null };
    }
    const node = vfs.getNode(currentId);
    return { id: currentId, node };
  }

  // Helper method to resolve path argument (folders only)
  resolvePath(pathStr: string): string | null | undefined {
    const res = this.resolvePathToNode(pathStr);
    if (!res) return undefined;
    if (res.id !== null && res.node && res.node.type !== "folder") {
      return undefined;
    }
    return res.id;
  }

  private buildTreeString(dirId: string | null, prefix = ""): string {
    const children = vfs.getChildren(dirId);
    let output = "";
    children.forEach((c, idx) => {
      const isLast = idx === children.length - 1;
      const marker = isLast ? "└── " : "├── ";
      output += prefix + marker + c.name + "\n";
      if (c.type === "folder") {
        const nextPrefix = prefix + (isLast ? "    " : "│   ");
        output += this.buildTreeString(c.id, nextPrefix);
      }
    });
    return output;
  }

  execute(commandLine: string): CommandResult {
    const rawCommand = commandLine.trim();
    if (!rawCommand) {
      return { output: "" };
    }

    // Add to command history list
    this.history.push(rawCommand);

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

    const manuals: Record<string, string> = {
      help: "help - List all available commands\n\nUsage: help",
      clear: "clear - Clear the terminal screen\n\nUsage: clear",
      ls: "ls - List files and directories in the current working directory\n\nUsage: ls",
      cd: "cd - Change the current working directory\n\nUsage: cd [path]\n\nSupports:\n  ..         (Parent directory)\n  ~ or /     (Root directory)\n  relative/absolute paths",
      mkdir: "mkdir - Create a new directory\n\nUsage: mkdir <folder_name>",
      touch: "touch - Create a new empty file\n\nUsage: touch <file_name>",
      cat: "cat - Display the text contents of a file\n\nUsage: cat <file_name>",
      echo: "echo - Output text or write to a file\n\nUsage:\n  echo <text>             (Print text to console)\n  echo <text> > <file>    (Write/overwrite file with text)",
      rm: "rm - Remove files or directories\n\nUsage: rm [-r] [-rf] [-f] <path>\n\nFlags:\n  -r, -rf    Remove directories and their contents recursively\n  -f         Ignore nonexistent files and arguments, never prompt",
      rmdir: "rmdir - Remove empty directories\n\nUsage: rmdir <directory_name>",
      mv: "mv - Move or rename files and directories\n\nUsage: mv <source> <destination>",
      cp: "cp - Copy files or directories\n\nUsage: cp [-r] <source> <destination>\n\nFlags:\n  -r         Copy directories recursively",
      pwd: "pwd - Print absolute working directory path\n\nUsage: pwd",
      whoami: "whoami - Print the current system username\n\nUsage: whoami",
      date: "date - Display the current date and time\n\nUsage: date",
      uname: "uname - Print system architecture and operating system information\n\nUsage: uname [-a]\n\nFlags:\n  -a         Print all system information",
      history: "history - Display the command history list\n\nUsage: history",
      tree: "tree - Render a visual tree representation of directories and files\n\nUsage: tree",
      grep: "grep - Search for patterns in a file\n\nUsage: grep <pattern> <file_name>",
      open: "open - Bridge CLI to GUI: opens a folder in File Explorer or a file in Notes\n\nUsage: open <path>",
      nano: "nano - Edit text files using the graphical text/markdown editor\n\nUsage: nano <filename>",
      vim: "vim - Edit text files using the graphical text/markdown editor\n\nUsage: vim <filename>",
      code: "code - Edit text files using the graphical text/markdown editor\n\nUsage: code <filename>",
    };

    switch (cmd) {
      case "help":
        return {
          output: [
            "Available UNIX-style commands:",
            "  help              - Display this list of commands",
            "  clear             - Clear the screen",
            "  ls                - List files and directories",
            "  cd [path]         - Change working directory",
            "  mkdir <name>      - Create a folder",
            "  touch <name>      - Create an empty file",
            "  cat <name>        - Read file contents",
            "  echo <text> > <f> - Write file content",
            "  rm [-r] <path>    - Remove folder or file",
            "  rmdir <path>      - Remove empty directory",
            "  mv <src> <dest>   - Move or rename node",
            "  cp [-r] <s/> <d>  - Copy folder or file",
            "  pwd               - Print working directory",
            "  whoami            - Current user",
            "  date              - System timestamp",
            "  uname [-a]        - Kernel & OS details",
            "  history           - Past command list",
            "  tree              - Visual directory tree",
            "  grep <pat> <file> - Search matches in file",
            "  man <command>     - Command manual pages",
            "  open <path>       - Open GUI window at path",
            "  neofetch          - Stylized Iris OS specs",
            "  nano <filename>   - Edit file in GUI Text Editor",
            "  vim <filename>    - Edit file in GUI Text Editor",
            "  code <filename>   - Edit file in GUI Text Editor"
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

      case "rm": {
        let recursive = false;
        let force = false;
        const pathParts: string[] = [];
        for (const part of args) {
          if (part.startsWith("-")) {
            if (part.includes("r")) recursive = true;
            if (part.includes("f")) force = true;
          } else {
            pathParts.push(part);
          }
        }
        const pathArg = pathParts.join(" ");
        if (!pathArg) {
          if (force) return { output: "" };
          return { output: "rm: missing operand", error: true };
        }

        const target = this.resolvePathToNode(pathArg);
        if (!target) {
          if (force) return { output: "" };
          return { output: `rm: cannot remove '${pathArg}': No such file or directory`, error: true };
        }
        if (target.id === null) {
          return { output: "rm: cannot remove '/': Permission denied", error: true };
        }
        if (target.node?.type === "folder" && !recursive) {
          return { output: `rm: cannot remove '${pathArg}': Is a directory`, error: true };
        }
        vfs.deleteNode(target.id);
        return { output: "" };
      }

      case "rmdir": {
        const pathArg = args.join(" ");
        if (!pathArg) {
          return { output: "rmdir: missing operand", error: true };
        }
        const target = this.resolvePathToNode(pathArg);
        if (!target || target.id === null) {
          return { output: `rmdir: failed to remove '${pathArg}': No such file or directory`, error: true };
        }
        if (target.node?.type !== "folder") {
          return { output: `rmdir: failed to remove '${pathArg}': Not a directory`, error: true };
        }
        const children = vfs.getChildren(target.id);
        if (children.length > 0) {
          return { output: `rmdir: failed to remove '${pathArg}': Directory not empty`, error: true };
        }
        vfs.deleteNode(target.id);
        return { output: "" };
      }

      case "mv": {
        if (args.length < 2) {
          return { output: "mv: missing file operand", error: true };
        }
        const srcArg = args[0];
        const destArg = args[1];

        const srcTarget = this.resolvePathToNode(srcArg);
        if (!srcTarget || srcTarget.id === null || !srcTarget.node) {
          return { output: `mv: cannot stat '${srcArg}': No such file or directory`, error: true };
        }

        const destTarget = this.resolvePathToNode(destArg);
        if (destTarget && destTarget.node && destTarget.node.type === "folder") {
          vfs.moveNode(srcTarget.id, destTarget.id);
          return { output: "" };
        } else {
          const lastSlash = destArg.lastIndexOf("/");
          let parentPath = "";
          let newName = destArg;
          if (lastSlash !== -1) {
            parentPath = destArg.substring(0, lastSlash);
            newName = destArg.substring(lastSlash + 1);
          }

          const parentTarget = this.resolvePathToNode(parentPath || ".");
          if (!parentTarget) {
            return { output: `mv: cannot move to '${destArg}': No such file or directory`, error: true };
          }

          vfs.moveNode(srcTarget.id, parentTarget.id);
          if (newName) {
            vfs.renameNode(srcTarget.id, newName);
          }
          return { output: "" };
        }
      }

      case "cp": {
        let recursive = false;
        const copyParts: string[] = [];
        for (const part of args) {
          if (part.startsWith("-")) {
            if (part.includes("r")) recursive = true;
          } else {
            copyParts.push(part);
          }
        }
        if (copyParts.length < 2) {
          return { output: "cp: missing destination file operand", error: true };
        }
        const srcArg = copyParts[0];
        const destArg = copyParts[1];

        const srcTarget = this.resolvePathToNode(srcArg);
        if (!srcTarget || srcTarget.id === null || !srcTarget.node) {
          return { output: `cp: cannot stat '${srcArg}': No such file or directory`, error: true };
        }
        if (srcTarget.node.type === "folder" && !recursive) {
          return { output: `cp: -r not specified; omitting directory '${srcArg}'`, error: true };
        }

        const destTarget = this.resolvePathToNode(destArg);
        if (destTarget && destTarget.node && destTarget.node.type === "folder") {
          vfs.copyNode(srcTarget.id, destTarget.id);
          return { output: "" };
        } else {
          const lastSlash = destArg.lastIndexOf("/");
          let parentPath = "";
          let newName = destArg;
          if (lastSlash !== -1) {
            parentPath = destArg.substring(0, lastSlash);
            newName = destArg.substring(lastSlash + 1);
          }

          const parentTarget = this.resolvePathToNode(parentPath || ".");
          if (!parentTarget) {
            return { output: `cp: cannot create regular file '${destArg}': No such file or directory`, error: true };
          }

          const copyId = vfs.copyNode(srcTarget.id, parentTarget.id);
          if (copyId && newName) {
            vfs.renameNode(copyId, newName);
          }
          return { output: "" };
        }
      }

      case "pwd": {
        if (this.currentDirId === null) {
          return { output: "/" };
        }
        const pathNodes = vfs.getPath(this.currentDirId);
        return { output: "/" + pathNodes.map((n) => n.name).join("/") };
      }

      case "whoami":
        return { output: "iris" };

      case "date":
        return { output: new Date().toString() };

      case "uname": {
        const allInfo = args.includes("-a");
        if (allInfo) {
          return { output: "Iris OS 1.0.0 x86_64 Web-Kernel" };
        }
        return { output: "IrisOS" };
      }

      case "history": {
        return {
          output: this.history.map((cmdStr, index) => `  ${index + 1}  ${cmdStr}`).join("\n"),
        };
      }

      case "tree": {
        const rootName = this.currentDirId ? vfs.getNode(this.currentDirId)?.name || "." : ".";
        return { output: rootName + "\n" + this.buildTreeString(this.currentDirId) };
      }

      case "grep": {
        if (args.length < 2) {
          return { output: "Usage: grep <pattern> <filename>", error: true };
        }
        const pattern = args[0];
        const fileName = args.slice(1).join(" ");
        const children = vfs.getChildren(this.currentDirId);
        const file = children.find((c) => c.name === fileName && c.type === "file");
        if (!file) {
          return { output: `grep: ${fileName}: No such file`, error: true };
        }
        const content = file.content || "";
        const lines = content.split("\n");
        const matchedLines: string[] = [];

        let regex: RegExp;
        try {
          regex = new RegExp(pattern, "i");
        } catch (e) {
          regex = new RegExp(pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
        }

        lines.forEach((line) => {
          if (regex.test(line)) {
            matchedLines.push(line);
          }
        });
        return { output: matchedLines.join("\n") };
      }

      case "man": {
        const targetCommand = args.join(" ");
        if (!targetCommand) {
          return { output: "What manual page do you want?\nExample: man cd", error: true };
        }
        const manual = manuals[targetCommand.toLowerCase()];
        if (!manual) {
          return { output: `No manual entry for ${targetCommand}`, error: true };
        }
        return { output: manual };
      }

      case "nano":
      case "vim":
      case "code": {
        const fileName = args.join(" ");
        if (!fileName) {
          return { output: `${cmd}: missing filename`, error: true };
        }

        const children = vfs.getChildren(this.currentDirId);
        const existingNode = children.find((c) => c.name === fileName);
        if (existingNode) {
          if (existingNode.type === "folder") {
            return { output: `bash: ${fileName}: Is a directory`, error: true };
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("notes-open-file", { detail: { fileId: existingNode.id } }));
            openWindow("notes");
          }
          return { output: `Opening '${fileName}' in Notes/Text Editor...` };
        }

        const file = vfs.createFile(fileName, this.currentDirId, "");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("notes-open-file", { detail: { fileId: file.id } }));
          openWindow("notes");
        }
        return { output: `Opening '${fileName}' in Notes/Text Editor...` };
      }

      case "open":
      case "xdg-open": {
        const pathArg = args.join(" ");
        if (!pathArg) {
          return { output: "Usage: open <path>", error: true };
        }
        const target = this.resolvePathToNode(pathArg);
        if (!target) {
          return { output: `open: ${pathArg}: No such file or directory`, error: true };
        }

        if (typeof window !== "undefined") {
          if (target.id === null || (target.node && target.node.type === "folder")) {
            window.dispatchEvent(new CustomEvent("explorer-navigate", { detail: { dirId: target.id } }));
            openWindow("explorer");
            return { output: `Opening ${pathArg || "Home"} in File Explorer...` };
          } else if (target.node && target.node.type === "file") {
            if (target.node.name.endsWith(".md")) {
              window.dispatchEvent(new CustomEvent("notes-open-file", { detail: { fileId: target.id } }));
              openWindow("notes");
              return { output: `Opening note '${target.node.name}' in Notes app...` };
            } else {
              return { output: `open: format not supported for '${target.node.name}'`, error: true };
            }
          }
        }
        return { output: "" };
      }

      case "neofetch": {
        const vfsCount = vfs.getAllNodes().length;
        return {
          output: [
            "      .---.       OS: Iris OS x86_64",
            "     /     \\      Host: Web Environment",
            "     \\.---./      Kernel: TypeScript VFS 1.0",
            "    (  | |  )     Uptime: " + Math.round(performance.now() / 1000) + "s",
            "     \\_|_|_/      Shell: iris-bash",
            "   _.-' | '-._    Theme: Neon Dark",
            "  '---'---'---'   Font: Monospace (VFS Nodes: " + vfsCount + ")"
          ].join("\n")
        };
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
