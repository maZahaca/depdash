import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";

const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateTokenSchema.parse(body);

    // Verify user is member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: validated.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    // Generate secure random token
    const token = `dep_${randomBytes(32).toString("hex")}`;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const prefix = token.substring(0, 12);

    // Create token in database
    const apiToken = await prisma.apiToken.create({
      data: {
        name: validated.name,
        tokenHash,
        prefix,
        organizationId: validated.organizationId,
        createdBy: session.user.id,
      },
    });

    // Return the full token ONLY on creation (never shown again)
    return NextResponse.json({
      id: apiToken.id,
      name: apiToken.name,
      token: token, // Full token only shown once
      createdAt: apiToken.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error creating token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
