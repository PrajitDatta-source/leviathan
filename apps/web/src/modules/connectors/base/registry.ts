import { Connector } from "./types";

class ConnectorRegistry {
  private connectors = new Map<string, Connector>();

  register(connector: Connector): void {
    if (this.connectors.has(connector.config.id)) {
      throw new Error(`Connector "${connector.config.id}" is already registered.`);
    }

    this.connectors.set(connector.config.id, connector);
  }

  get(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  getAll(): Connector[] {
    return Array.from(this.connectors.values());
  }

  getConnected(): Connector[] {
    return this.getAll().filter(connector => connector.isConnected());
  }

  search(query: string): Promise<any[]> {
    const connectedConnectors = this.getConnected();
    
    return Promise.all(
      connectedConnectors.map(connector => 
        connector.search(query).catch(error => {
          console.error(`Search failed for ${connector.config.id}:`, error);
          return [];
        })
      )
    ).then(results => results.flat());
  }

  clear(): void {
    this.connectors.clear();
  }
}

export const connectorRegistry = new ConnectorRegistry();
