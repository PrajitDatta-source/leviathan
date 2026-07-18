export interface ConnectorConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
  version: string;
}

export interface ConnectorState {
  connected: boolean;
  lastSync?: Date;
  error?: string;
}

export interface ConnectorData {
  [key: string]: any;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url?: string;
  type: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface Connector {
  readonly config: ConnectorConfig;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getState(): ConnectorState;
  
  getData(options?: any): Promise<ConnectorData>;
  search(query: string, options?: any): Promise<SearchResult[]>;
  
  // Optional real-time support
  subscribe?(callback: (data: ConnectorData) => void): () => void;
  
  // Optional webhook support
  handleWebhook?(data: any): Promise<void>;
}
