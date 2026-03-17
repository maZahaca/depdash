import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to add users (OWNER or ADMIN)
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, role, organizationId } = body;

    if (!email || !password || !role || !organizationId) {
      return NextResponse.json(
        { error: "Email, password, role, and organizationId are required" },
        { status: 400 }
      );
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
