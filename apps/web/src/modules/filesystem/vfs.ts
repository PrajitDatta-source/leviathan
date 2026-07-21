"use client";

import { showToast } from "@/components/shell/Toast";
import { autoSyncToCloud } from "@/lib/vault";

export interface VFSNode {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  content?: string; // File contents (or metadata)
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
  isTrash?: boolean;
  deletedAt?: string;
}

class VFSManager {
  private storageKey = "iris_vfs_nodes";
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

  private notifiedSyncFailure = false;

  async syncWithBackend() {
    try {
      const res = await fetch("/api/vfs");
      const nodes = await res.json();
      if (Array.isArray(nodes) && nodes.length > 0) {
        this.nodes = new Map(nodes.map((node) => [node.id, node]));
        const dataStr = JSON.stringify(nodes);
        localStorage.setItem(this.storageKey, dataStr);
        localStorage.setItem("iris_vfs_data", dataStr);
        window.dispatchEvent(new CustomEvent("vfs-synced"));
      } else {
        this.pushToBackend();
      }
    } catch (e) {
      console.error("VFS backend sync failed, fallback to local cache:", e);
      if (!this.notifiedSyncFailure) {
        this.notifiedSyncFailure = true;
        showToast("Can't reach the server — working from your local cache.");
      }
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
      const stored = localStorage.getItem(this.storageKey) || localStorage.getItem("iris_vfs_data");
      if (stored) {
        const parsed = JSON.parse(stored) as VFSNode[];
        this.nodes = new Map(parsed.map((node) => [node.id, node]));
      }
    } catch (e) {
      console.error("VFS load failed:", e);
    }
  }

  private clipboard: { type: "copy" | "cut"; nodeId: string } | null = null;

  setClipboard(type: "copy" | "cut", nodeId: string): void {
    this.clipboard = { type, nodeId };
  }

  getClipboard(): { type: "copy" | "cut"; nodeId: string } | null {
    return this.clipboard;
  }

  clearClipboard(): void {
    this.clipboard = null;
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      const array = Array.from(this.nodes.values());
      const dataStr = JSON.stringify(array);
      localStorage.setItem(this.storageKey, dataStr);
      localStorage.setItem("iris_vfs_data", dataStr);
      this.pushToBackend();
      window.dispatchEvent(new CustomEvent("vfs-synced"));
      window.dispatchEvent(new CustomEvent("vfs-updated"));
      autoSyncToCloud();
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
        content: `# Welcome to Iris OS! 👋\n\nThis is a browser-based personal operating system designed to manage your digital workspace.\n\n### Core Features in Alpha:\n- **File Explorer**: Browse folders, upload/download, create files.\n- **Notes App**: Markdown editor with auto-save and tag indexing.\n- **Terminal**: Run system commands (\`ls\`, \`cd\`, \`cat\`, \`neofetch\`).\n- **Command Palette** (\`Super + D\` / \`Alt + D\`): Run calculation operations, toggle themes, and find files.\n\nEnjoy customizing your new desktop environment!`,
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
      isTrash: false,
    };
    this.nodes.set(id, node);
    this.saveToStorage();
    return node;
  }

  getRootNodes(): VFSNode[] {
    return Array.from(this.nodes.values()).filter((n) => !n.isTrash && n.parentId === null);
  }

  getChildren(parentId: string | null): VFSNode[] {
    return Array.from(this.nodes.values()).filter((n) => !n.isTrash && n.parentId === parentId);
  }

  getTrashNodes(): VFSNode[] {
    return Array.from(this.nodes.values()).filter((n) => !!n.isTrash);
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

  deleteNode(id: string, permanent = false): void {
    const node = this.nodes.get(id);
    if (!node) return;

    if (permanent) {
      if (node.type === "folder") {
        const children = Array.from(this.nodes.values()).filter((c) => c.parentId === id);
        children.forEach((child) => this.deleteNode(child.id, true));
      }
      this.nodes.delete(id);
    } else {
      if (node.type === "folder") {
        const children = this.getChildren(id);
        children.forEach((child) => this.deleteNode(child.id, false));
      }
      node.isTrash = true;
      node.deletedAt = new Date().toISOString();
    }

    this.saveToStorage();
  }

  restoreNode(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      node.isTrash = false;
      delete node.deletedAt;
      if (node.type === "folder") {
        const children = Array.from(this.nodes.values()).filter((c) => c.parentId === id);
        children.forEach((child) => this.restoreNode(child.id));
      }
      this.saveToStorage();
    }
  }

  emptyTrash(): void {
    const trashed = this.getTrashNodes();
    trashed.forEach((node) => {
      this.nodes.delete(node.id);
    });
    this.saveToStorage();
  }

  moveNode(id: string, newParentId: string | null): void {
    const node = this.nodes.get(id);
    if (node) {
      node.parentId = newParentId;
      node.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  copyNode(id: string, newParentId: string | null): string | null {
    const original = this.nodes.get(id);
    if (!original) return null;

    const now = new Date().toISOString();
    const newId = crypto.randomUUID();
    const copy: VFSNode = {
      id: newId,
      name: original.name,
      type: original.type,
      parentId: newParentId,
      content: original.content,
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(newId, copy);

    if (original.type === "folder") {
      const children = this.getChildren(id);
      children.forEach((child) => {
        this.copyNode(child.id, newId);
      });
    }

    this.saveToStorage();
    return newId;
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
