"use client";

export interface VFSNode {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  content?: string; // File contents (or metadata)
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

class VFSManager {
  private storageKey = "leviathan_vfs_nodes";
  private nodes: Map<string, VFSNode> = new Map();

  constructor() {
    this.loadFromStorage();
    if (this.nodes.size === 0) {
      this.initializeDefaultFileSystem();
    }
    // Async synchronize VFS with Next.js backend
    if (typeof window !== "undefined") {
      this.syncWithBackend();
    }
  }

  async syncWithBackend() {
    try {
      const res = await fetch("/api/vfs");
      const nodes = await res.json();
      if (Array.isArray(nodes) && nodes.length > 0) {
        this.nodes = new Map(nodes.map((node) => [node.id, node]));
        localStorage.setItem(this.storageKey, JSON.stringify(nodes));
        window.dispatchEvent(new CustomEvent("vfs-synced"));
      } else {
        this.pushToBackend();
      }
    } catch (e) {
      console.error("VFS backend sync failed, fallback to local cache:", e);
    }
  }

  async pushToBackend() {
    try {
      const array = Array.from(this.nodes.values());
      await fetch("/api/vfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(array),
      });
    } catch (e) {
      console.error("VFS push to backend failed:", e);
    }
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as VFSNode[];
        this.nodes = new Map(parsed.map((node) => [node.id, node]));
      }
    } catch (e) {
      console.error("VFS load failed:", e);
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      const array = Array.from(this.nodes.values());
      localStorage.setItem(this.storageKey, JSON.stringify(array));
      this.pushToBackend();
    } catch (e) {
      console.error("VFS save failed:", e);
    }
  }

  private initializeDefaultFileSystem() {
    const now = new Date().toISOString();

    if (!this.nodes.has("documents_folder")) {
      this.nodes.set("documents_folder", {
        id: "documents_folder",
        name: "Documents",
        type: "folder",
        parentId: null,
        createdAt: now,
        updatedAt: now
      });
    }

    if (!this.nodes.has("downloads_folder")) {
      this.nodes.set("downloads_folder", {
        id: "downloads_folder",
        name: "Downloads",
        type: "folder",
        parentId: null,
        createdAt: now,
        updatedAt: now
      });
    }

    if (!this.nodes.has("notes_folder")) {
      this.nodes.set("notes_folder", {
        id: "notes_folder",
        name: "Notes",
        type: "folder",
        parentId: null,
        createdAt: now,
        updatedAt: now
      });
    }

    // Welcome file
    if (!this.nodes.has("welcome_file")) {
      this.nodes.set("welcome_file", {
        id: "welcome_file",
        name: "welcome.md",
        type: "file",
        parentId: null,
        content: `# Welcome to Leviathan OS! 👋\n\nThis is a browser-based personal operating system designed to manage your digital workspace.\n\n### Core Features in Alpha:\n- **File Explorer**: Browse folders, upload/download, create files.\n- **Notes App**: Markdown editor with auto-save and tag indexing.\n- **Terminal**: Run system commands (\`ls\`, \`cd\`, \`cat\`, \`neofetch\`).\n- **Command Palette** (\`Super + D\` / \`Alt + D\`): Run calculation operations, toggle themes, and find files.\n\nEnjoy customizing your new desktop environment!`,
        createdAt: now,
        updatedAt: now
      });
    }

    // Example Note
    if (!this.nodes.has("project_plan_file")) {
      this.nodes.set("project_plan_file", {
        id: "project_plan_file",
        name: "Project Plan.md",
        type: "file",
        parentId: "notes_folder",
        content: `# Project Plan: Phase 2 Goals\n\n- [x] Snapping layouts & snapping preview\n- [x] Custom context menu\n- [x] Mobile full-screen constraints\n- [ ] Expand desktop wallpaper settings\n- [ ] Configure full virtual workspace switching`,
        createdAt: now,
        updatedAt: now
      });
    }

    this.saveToStorage();
  }

  private createNode(
    name: string,
    type: "file" | "folder",
    parentId: string | null,
    content?: string
  ): VFSNode {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const node: VFSNode = {
      id,
      name,
      type,
      parentId,
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(id, node);
    this.saveToStorage();
    return node;
  }

  getRootNodes(): VFSNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.parentId === null);
  }

  getChildren(parentId: string | null): VFSNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.parentId === parentId);
  }

  getNode(id: string): VFSNode | undefined {
    return this.nodes.get(id);
  }

  createFile(name: string, parentId: string | null, content = ""): VFSNode {
    return this.createNode(name, "file", parentId, content);
  }

  createFolder(name: string, parentId: string | null): VFSNode {
    return this.createNode(name, "folder", parentId);
  }

  updateFileContent(id: string, content: string): void {
    const node = this.nodes.get(id);
    if (node && node.type === "file") {
      node.content = content;
      node.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  renameNode(id: string, newName: string): void {
    const node = this.nodes.get(id);
    if (node) {
      node.name = newName;
      node.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  deleteNode(id: string): void {
    // Delete descendants if it's a folder
    const node = this.nodes.get(id);
    if (!node) return;

    if (node.type === "folder") {
      const children = this.getChildren(id);
      children.forEach((child) => this.deleteNode(child.id));
    }

    this.nodes.delete(id);
    this.saveToStorage();
  }

  getAllNodes(): VFSNode[] {
    return Array.from(this.nodes.values());
  }

  getPath(nodeId: string): VFSNode[] {
    const path: VFSNode[] = [];
    let current = this.nodes.get(nodeId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? this.nodes.get(current.parentId) : undefined;
    }
    return path;
  }
}

export const vfs = new VFSManager();
