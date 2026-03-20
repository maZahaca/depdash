import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiEditAccess } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireApiEditAccess(request, "users");
    if (authContext instanceof NextResponse) {
      return authContext;
    }

    const body = await request.json();
    const { email, name, password, role, organizationId } = body;

    if (!email || !password || !role || !organizationId) {
      return NextResponse.json(
        { error: "Email, password, role, and organizationId are required" },
        { status: 400 }
      );
    }

    // Verify organization matches auth context
    if (organizationId !== authContext.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate role
    const validRoles = ["MEMBER", "ADMIN", "VIEWER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be MEMBER, ADMIN, or VIEWER" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if user is already a member of this organization
      const existingMembership = await prisma.organizationMember.findFirst({
        where: {
          userId: existingUser.id,
          organizationId,
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        );
      }

      // Add existing user to organization
      await prisma.organizationMember.create({
        data: {
          userId: existingUser.id,
          organizationId,
          role,
        },
      });

      return NextResponse.json({
        message: "User added to organization successfully",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user and add to organization
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
        memberships: {
          create: {
            organizationId,
            role,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
