// src/core/services/TelegramService.ts

export interface TelegramMessage {
  id: string;
  type: 'TG_DMS' | 'TG_GHOST_EDIT' | 'TG_GHOST_DELETE';
  sender: string;
  payload: string;
  created_at: string;
}

type MessageListener = (msg: TelegramMessage) => void;

class TelegramService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private listeners: Set<MessageListener> = new Set();
  private ghostVault: TelegramMessage[] = [];

  constructor() {
    this.loadGhostVault();
  }

  // --- Event Listener System for UI ---
  public subscribe(listener: MessageListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(msg: TelegramMessage) {
    this.listeners.forEach((listener) => listener(msg));
  }

  // --- Ghost Vault Persistence (Only Deletions / Edits) ---
  private loadGhostVault() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('iris_ghost_vault');
      if (saved) this.ghostVault = JSON.parse(saved);
    } catch (e) {
      console.error('[TelegramService] Failed to load Ghost Vault from storage:', e);
    }
  }

  private saveGhostVault() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('iris_ghost_vault', JSON.stringify(this.ghostVault));
    } catch (e) {
      console.error('[TelegramService] Failed to persist Ghost Vault:', e);
    }
  }

  public getGhostVaultMessages(): TelegramMessage[] {
    return [...this.ghostVault];
  }

  // --- Daemon Controls ---
  public startService() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.pollingInterval = setInterval(() => this.fetchStagedMessages(), 3000);
  }

  public stopService() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.isPolling = false;
  }

  private async fetchStagedMessages() {
    try {
      const res = await fetch('/api/connectors/telegram');
      if (!res.ok) return;

      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach((msg: TelegramMessage) => this.processMessage(msg));
      }
    } catch (error) {
      console.error('[TelegramService] Polling error:', error);
    }
  }

  private processMessage(msg: TelegramMessage) {
    if (msg.type === 'TG_GHOST_DELETE' || msg.type === 'TG_GHOST_EDIT') {
      // 🔒 STORE: Only save deleted/edited text permanently
      this.ghostVault.unshift(msg);
      this.saveGhostVault();
    }
    
    // 📡 STREAM: Broadcast all incoming events (live DMs & ghosts) to the active UI window
    this.notify(msg);
  }
}

export const telegramService = new TelegramService();
