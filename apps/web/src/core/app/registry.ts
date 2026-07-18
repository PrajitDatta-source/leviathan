import { AppDefinition } from "./types";

class AppRegistry {
  private readonly apps = new Map<string, AppDefinition>();

  register(app: AppDefinition): void {
    if (this.apps.has(app.id)) {
      throw new Error(
        `Application "${app.id}" is already registered.`
      );
    }

    this.apps.set(app.id, app);
  }

  get(id: string): AppDefinition | undefined {
    return this.apps.get(id);
  }

  getAll(): AppDefinition[] {
    return [...this.apps.values()];
  }

  clear(): void {
    this.apps.clear();
  }
}

export const appRegistry = new AppRegistry();