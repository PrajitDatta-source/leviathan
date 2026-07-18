import { OAuthConfig, OAuthToken, AuthState } from "./types";

class AuthManager {
  private state: AuthState = {
    authenticated: false,
    tokens: new Map(),
  };

  private storageKey = "leviathan_auth_tokens";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.state.tokens = new Map(Object.entries(data));
        this.state.authenticated = this.state.tokens.size > 0;
      }
    } catch (error) {
      console.error("Failed to load auth tokens:", error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const data = Object.fromEntries(this.state.tokens);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save auth tokens:", error);
    }
  }

  setToken(provider: string, token: OAuthToken): void {
    // Calculate expiration if not provided
    if (token.expires_in && !token.expires_at) {
      token.expires_at = Date.now() + token.expires_in * 1000;
    }

    this.state.tokens.set(provider, token);
    this.state.authenticated = true;
    this.saveToStorage();
  }

  getToken(provider: string): OAuthToken | undefined {
    const token = this.state.tokens.get(provider);
    
    // Check if token is expired
    if (token && token.expires_at && Date.now() > token.expires_at) {
      this.removeToken(provider);
      return undefined;
    }

    return token;
  }

  removeToken(provider: string): void {
    this.state.tokens.delete(provider);
    this.state.authenticated = this.state.tokens.size > 0;
    this.saveToStorage();
  }

  hasToken(provider: string): boolean {
    return this.getToken(provider) !== undefined;
  }

  isAuthenticated(): boolean {
    return this.state.authenticated;
  }

  getConnectedProviders(): string[] {
    return Array.from(this.state.tokens.keys());
  }

  clearAll(): void {
    this.state.tokens.clear();
    this.state.authenticated = false;
    this.saveToStorage();
  }

  generateAuthUrl(config: OAuthConfig): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(" "),
      response_type: "code",
    });

    return `${config.authUrl}?${params.toString()}`;
  }
}

export const authManager = new AuthManager();
