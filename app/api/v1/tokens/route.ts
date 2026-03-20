import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { requireApiEditAccess, requireApiViewAccess } from "@/lib/api-auth";

const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireApiEditAccess(request, "api_tokens");
    if (authContext instanceof NextResponse) {
      return authContext;
    }

    const body = await request.json();
    const validated = CreateTokenSchema.parse(body);

    // Verify user has access to the organization
    if (validated.organizationId !== authContext.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        createdBy: authContext.userId,
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
