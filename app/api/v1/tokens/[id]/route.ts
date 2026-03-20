import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiEditAccess } from "@/lib/api-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requireApiEditAccess(request, "api_tokens");
    if (authContext instanceof NextResponse) {
      return authContext;
    }

    const { id } = await params;

    // Find the token
    const token = await prisma.apiToken.findUnique({
      where: { id },
    });

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // Verify token belongs to user's organization
    if (token.organizationId !== authContext.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the token
    await prisma.apiToken.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
