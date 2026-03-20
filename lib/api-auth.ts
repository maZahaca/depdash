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
};

/**
 * Get auth context from session (for authenticated API routes)
 */
export async function getApiAuthContext(): Promise<ApiAuthContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
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

  // API tokens have OWNER level permissions for the organization
  return {
    userId: apiToken.organization.members[0].userId,
    organizationId: apiToken.organizationId,
    role: "OWNER",
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

  if (!canEdit(context.role, resource)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return context;
}
