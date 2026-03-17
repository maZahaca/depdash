import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;

    // Get the membership to delete
    const membershipToDelete = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: { organization: true },
    });

    if (!membershipToDelete) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if current user has permission to delete (OWNER or ADMIN in the same org)
    const currentUserMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: membershipToDelete.organizationId,
      },
    });

    if (
      !currentUserMembership ||
      (currentUserMembership.role !== "OWNER" && currentUserMembership.role !== "ADMIN")
    ) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Prevent deleting owners
    if (membershipToDelete.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove owner" }, { status: 403 });
    }

    // Prevent users from deleting themselves
    if (membershipToDelete.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
      );
    }

    // Delete the membership
    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({
      message: "User removed from organization successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
