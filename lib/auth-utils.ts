import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { Resource, canView, canEdit } from "./permissions";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: MemberRole;
};

/**
 * Get the authenticated user's context including their organization and role
 * Returns null if user is not authenticated or not part of an organization
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

/**
 * Require authentication and organization membership
 * Redirects to login if not authenticated
 * Returns 404 if user is not part of an organization
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

/**
 * Require VIEW permission for a resource
 * Returns 404 if user doesn't have access
 */
export async function requireViewAccess(resource: Resource): Promise<AuthContext> {
  const context = await requireAuth();

  if (!canView(context.role, resource)) {
    notFound();
  }

  return context;
}

/**
 * Require EDIT permission for a resource
 * Returns 404 if user doesn't have access
 */
export async function requireEditAccess(resource: Resource): Promise<AuthContext> {
  const context = await requireAuth();

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

  return canEdit(context.role, resource);
}
