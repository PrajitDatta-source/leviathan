export type Permission = "read" | "write" | "delete" | "admin";

export interface ResourcePermission {
  resource: string;
  permissions: Permission[];
}

export interface AppPermissions {
  appId: string;
  resources: ResourcePermission[];
}

export interface PermissionState {
  appPermissions: Map<string, AppPermissions>;
}
