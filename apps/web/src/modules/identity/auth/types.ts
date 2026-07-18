export interface OAuthConfig {
  provider: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  expires_at?: number;
}

export interface AuthState {
  authenticated: boolean;
  tokens: Map<string, OAuthToken>;
}
