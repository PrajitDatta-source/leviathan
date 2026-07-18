import { Permission, AppPermissions, PermissionState } from "./types";

class PermissionManager {
  private state: PermissionState = {
    appPermissions: new Map(),
  };

  private storageKey = "leviathan_permissions";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.state.appPermissions = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error("Failed to load permissions:", error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const data = Object.fromEntries(this.state.appPermissions);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save permissions:", error);
    }
  }

  grantPermission(appId: string, resource: string, permissions: Permission[]): void {
    let appPerms = this.state.appPermissions.get(appId);

    if (!appPerms) {
      appPerms = {
        appId,
        resources: [],
      };
      this.state.appPermissions.set(appId, appPerms);
    }

    const existingResource = appPerms.resources.find(r => r.resource === resource);
    if (existingResource) {
      existingResource.permissions = permissions;
    } else {
      appPerms.resources.push({ resource, permissions });
    }

    this.saveToStorage();
  }

  revokePermission(appId: string, resource: string): void {
    const appPerms = this.state.appPermissions.get(appId);
    if (appPerms) {
      appPerms.resources = appPerms.resources.filter(r => r.resource !== resource);
      this.saveToStorage();
    }
  }

  hasPermission(appId: string, resource: string, permission: Permission): boolean {
    const appPerms = this.state.appPermissions.get(appId);
    if (!appPerms) return false;

    const resourcePerms = appPerms.resources.find(r => r.resource === resource);
    if (!resourcePerms) return false;

    return resourcePerms.permissions.includes(permission) || resourcePerms.permissions.includes("admin");
  }

  getAppPermissions(appId: string): AppPermissions | undefined {
    return this.state.appPermissions.get(appId);
  }

  getAllPermissions(): AppPermissions[] {
    return Array.from(this.state.appPermissions.values());
  }

  revokeAllAppPermissions(appId: string): void {
    this.state.appPermissions.delete(appId);
    this.saveToStorage();
  }

  clearAll(): void {
    this.state.appPermissions.clear();
    this.saveToStorage();
  }
}

export const permissionManager = new PermissionManager();
