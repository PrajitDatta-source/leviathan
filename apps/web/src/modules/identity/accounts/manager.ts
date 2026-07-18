import { Account, AccountState } from "./types";
import { authManager } from "../auth/manager";

class AccountManager {
  private state: AccountState = {
    accounts: new Map(),
  };

  private storageKey = "leviathan_accounts";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.state.accounts = new Map(
          Object.entries(data).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              connectedAt: new Date(value.connectedAt),
              lastSync: value.lastSync ? new Date(value.lastSync) : undefined,
            },
          ])
        );
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const data = Object.fromEntries(this.state.accounts);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save accounts:", error);
    }
  }

  addAccount(account: Account): void {
    this.state.accounts.set(account.id, account);
    this.saveToStorage();
  }

  removeAccount(id: string): void {
    const account = this.state.accounts.get(id);
    if (account) {
      // Also remove the auth token
      authManager.removeToken(account.provider);
      this.state.accounts.delete(id);
      this.saveToStorage();
    }
  }

  getAccount(id: string): Account | undefined {
    return this.state.accounts.get(id);
  }

  getAccountByProvider(provider: string): Account | undefined {
    return Array.from(this.state.accounts.values()).find(
      account => account.provider === provider
    );
  }

  getAllAccounts(): Account[] {
    return Array.from(this.state.accounts.values());
  }

  updateAccount(id: string, updates: Partial<Account>): void {
    const account = this.state.accounts.get(id);
    if (account) {
      this.state.accounts.set(id, { ...account, ...updates });
      this.saveToStorage();
    }
  }

  updateLastSync(id: string): void {
    this.updateAccount(id, { lastSync: new Date() });
  }

  clearAll(): void {
    this.state.accounts.clear();
    this.saveToStorage();
  }
}

export const accountManager = new AccountManager();
