import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import { Resource, canView, canEdit } from "./permissions";
import { createHash } from "crypto";

export type ApiAuthContext = {
  userId: string;
  organizationId: string;
  role: MemberRole;
  isSuperAdmin: boolean;
};

/**
 * Get auth context from session (for authenticated API routes)
 */
export async function getApiAuthContext(): Promise<ApiAuthContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get organization from session (JWT)
  const organizationId = session.user.organizationId;

  if (!organizationId) {
    return null;
  }

  // Super admins are not org members but still have access
  if (session.user.isSuperAdmin) {
    return {
      userId: session.user.id,
      organizationId,
      role: "OWNER" as MemberRole,
      isSuperAdmin: true,
    };
  }

  // Get role and organization active status from database
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
    },
    include: {
      organization: {
        select: { active: true },
      },
    },
  });

  if (!membership) {
    return null;
  }

  // Regular users cannot access deactivated organizations
  if (!membership.organization.active) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId,
    role: membership.role,
    isSuperAdmin: false,
  };
}

/**
 * Get auth context from API token (for CI/CD integrations)
 */
export async function getApiTokenContext(
  request: NextRequest
): Promise<ApiAuthContext | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: {
      organization: {
        include: {
          members: {
            take: 1,
            where: {
              role: "OWNER",
            },
          },
        },
      },
    },
  });

  if (!apiToken || !apiToken.organization.members[0]) {
    return null;
  }

  // API tokens cannot be used with deactivated organizations
  if (!apiToken.organization.active) {
    return null;
  }

  // API tokens have OWNER level permissions for the organization
  return {
    userId: apiToken.organization.members[0].userId,
    organizationId: apiToken.organizationId,
    role: "OWNER",
    isSuperAdmin: false, // API tokens are never super admin
  };
}

/**
 * Require authentication for API routes
 * Supports both session auth and API token auth
 */
export async function requireApiAuth(
  request: NextRequest
): Promise<ApiAuthContext | NextResponse> {
  // Try API token first
  const tokenContext = await getApiTokenContext(request);
  if (tokenContext) {
    return tokenContext;
  }

  // Try session auth
  const sessionContext = await getApiAuthContext();
  if (sessionContext) {
    return sessionContext;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Require VIEW permission for API routes
 */
export async function requireApiViewAccess(
  request: NextRequest,
  resource: Resource
): Promise<ApiAuthContext | NextResponse> {
  const context = await requireApiAuth(request);

  if (context instanceof NextResponse) {
    return context;
  }

  // Super admins have access to everything
  if (context.isSuperAdmin) {
    return context;
  }

  if (!canView(context.role, resource)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return context;
}

/**
 * Require EDIT permission for API routes
 */
export async function requireApiEditAccess(
  request: NextRequest,
  resource: Resource
): Promise<ApiAuthContext | NextResponse> {
  const context = await requireApiAuth(request);

  if (context instanceof NextResponse) {
    return context;
  }

  // Super admins have access to everything
  if (context.isSuperAdmin) {
    return context;
  }

  if (!canEdit(context.role, resource)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return context;
}
