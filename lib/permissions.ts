import { MemberRole } from "@prisma/client";

export type Permission = "VIEW" | "EDIT";
export type Resource =
  | "dashboard"
  | "vulnerabilities"
  | "repositories"
  | "scans"
  | "analytics"
  | "integrations"
  | "settings"
  | "users"
  | "api_tokens"
  | "slack_webhooks"
  | "organizations"; // Only SUPER_ADMIN can access

type PermissionConfig = {
  [K in Resource]: {
    [R in MemberRole]?: Permission[];
  };
};

// Centralized permissions configuration
export const PERMISSIONS: PermissionConfig = {
  dashboard: {
    OWNER: ["VIEW"],
    ADMIN: ["VIEW"],
    MEMBER: ["VIEW"],
    VIEWER: ["VIEW"],
  },
  vulnerabilities: {
    OWNER: ["VIEW", "EDIT"],
    ADMIN: ["VIEW", "EDIT"],
    MEMBER: ["VIEW", "EDIT"],
    VIEWER: ["VIEW"],
  },
  repositories: {
    OWNER: ["VIEW", "EDIT"],
    ADMIN: ["VIEW", "EDIT"],
    MEMBER: ["VIEW"],
    VIEWER: ["VIEW"],
  },
  scans: {
    OWNER: ["VIEW"],
    ADMIN: ["VIEW"],
    MEMBER: ["VIEW"],
    VIEWER: ["VIEW"],
  },
  analytics: {
    OWNER: ["VIEW"],
    ADMIN: ["VIEW"],
    MEMBER: ["VIEW"],
    VIEWER: ["VIEW"],
  },
  integrations: {
    OWNER: ["VIEW", "EDIT"],
    ADMIN: ["VIEW", "EDIT"],
    MEMBER: ["VIEW"],
    VIEWER: [], // No access
  },
  settings: {
    OWNER: ["VIEW", "EDIT"],
    ADMIN: ["VIEW", "EDIT"],
    MEMBER: ["VIEW"],
    VIEWER: [], // No access
  },
  users: {
    OWNER: ["VIEW", "EDIT"],
    ADMIN: ["VIEW", "EDIT"],
    MEMBER: ["VIEW"],
    VIEWER: [], // No access
  },
  api_tokens: {
    OWNER: ["VIEW", "EDIT"],
    ADMIN: ["VIEW", "EDIT"],
    MEMBER: ["VIEW"],
    VIEWER: [], // No access
  },
  slack_webhooks: {
    OWNER: ["VIEW", "EDIT"],
    ADMIN: ["VIEW", "EDIT"],
    MEMBER: ["VIEW"],
    VIEWER: [], // No access
  },
  organizations: {
    // Only SUPER_ADMIN can access - handled in auth-utils
    OWNER: [],
    ADMIN: [],
    MEMBER: [],
    VIEWER: [],
  },
};

// Helper function to check if a role has a specific permission for a resource
export function hasPermission(
  role: MemberRole | undefined,
  resource: Resource,
  permission: Permission
): boolean {
  if (!role) return false;

  const permissions = PERMISSIONS[resource]?.[role] || [];
  return permissions.includes(permission);
}

// Helper function to check if a role can view a resource
export function canView(role: MemberRole | undefined, resource: Resource): boolean {
  return hasPermission(role, resource, "VIEW");
}

// Helper function to check if a role can edit a resource
export function canEdit(role: MemberRole | undefined, resource: Resource): boolean {
  return hasPermission(role, resource, "EDIT");
}
