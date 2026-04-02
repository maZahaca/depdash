import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// PATCH /api/v1/organizations/:orgId - Update organization (toggle active status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const { active } = body;

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Active status must be a boolean" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: { active },
    });

    return NextResponse.json({
      message: `Organization ${active ? "activated" : "deactivated"} successfully`,
      organization,
    });
  } catch (error: any) {
    console.error("Error updating organization:", error);

    // Return 404 for non-existent organization (Prisma P2025 error)
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
