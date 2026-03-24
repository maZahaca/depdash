import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { Resource, canView, canEdit } from "./permissions";

export type AuthContext = {
  userId: string;
  organizationId: string | null; // null for SUPER_ADMIN
  role: MemberRole | null; // null for SUPER_ADMIN
  isSuperAdmin: boolean;
};

/**
 * Get the authenticated user's context including their organization and role
 * Returns null if user is not authenticated
 * For SUPER_ADMIN: organizationId may be null if not selected yet
 */
export async function getAuthContext(orgId?: string): Promise<AuthContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const isSuperAdmin = session.user.isSuperAdmin || false;
  const sessionOrgId = session.user.organizationId;

  // Use explicitly passed orgId, then session orgId
  const effectiveOrgId = orgId || sessionOrgId;

  if (isSuperAdmin) {
    // Super admin with an org selected
    if (effectiveOrgId) {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          organizationId: effectiveOrgId,
        },
      });

      return {
        userId: session.user.id,
        organizationId: effectiveOrgId,
        role: membership?.role || null,
        isSuperAdmin: true,
      };
    }

    // Super admin without org selected
    return {
      userId: session.user.id,
      organizationId: null,
      role: null,
      isSuperAdmin: true,
    };
  }

  // Regular user - must have organizationId in session
  if (!sessionOrgId) {
    return null;
  }

  // Fetch role from DB
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId: sessionOrgId,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId: sessionOrgId,
    role: membership.role,
    isSuperAdmin: false,
  };
}

/**
 * Require authentication and organization membership
 * Redirects to login if not authenticated
 * Redirects super admins without org to admin panel
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  // Super admins without org should use admin panel
  if (context.isSuperAdmin && !context.organizationId) {
    redirect("/admin");
  }

  return context;
}

/**
 * Require VIEW permission for a resource
 * Returns 404 if user doesn't have access
 */
export async function requireViewAccess(resource: Resource, orgId?: string): Promise<AuthContext> {
  const context = await requireAuth();

  // SUPER_ADMIN has access to everything
  if (context.isSuperAdmin) {
    return context;
  }

  if (!canView(context.role, resource)) {
    notFound();
  }

  return context;
}

/**
 * Require EDIT permission for a resource
 * Returns 404 if user doesn't have access
 */
export async function requireEditAccess(resource: Resource, orgId?: string): Promise<AuthContext> {
  const context = await requireAuth();

  // SUPER_ADMIN has access to everything
  if (context.isSuperAdmin) {
    return context;
  }

  if (!canEdit(context.role, resource)) {
    notFound();
  }

  return context;
}

/**
 * Check if user has VIEW access to a resource
 * Returns false if not authenticated or doesn't have access
 */
export async function checkViewAccess(resource: Resource): Promise<boolean> {
  const context = await getAuthContext();

  if (!context) {
    return false;
  }

  // SUPER_ADMIN has access to everything
  if (context.isSuperAdmin) {
    return true;
  }

  return canView(context.role, resource);
}

/**
 * Check if user has EDIT access to a resource
 * Returns false if not authenticated or doesn't have access
 */
export async function checkEditAccess(resource: Resource): Promise<boolean> {
  const context = await getAuthContext();

  if (!context) {
    return false;
  }

  // SUPER_ADMIN has access to everything
  if (context.isSuperAdmin) {
    return true;
  }

  return canEdit(context.role, resource);
}

/**
 * Check if user is a SUPER_ADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });

  return user?.isSuperAdmin || false;
}

/**
 * Require SUPER_ADMIN role
 * Returns 404 if user is not a SUPER_ADMIN
 * Does NOT require organization to be selected (for admin panel routes)
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const context = await getAuthContext();

  if (!context || !context.isSuperAdmin) {
    notFound();
  }

  return context;
}
