export interface Account {
  id: string;
  provider: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  connectedAt: Date;
  lastSync?: Date;
}

export interface AccountState {
  accounts: Map<string, Account>;
}
