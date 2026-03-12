import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { sendSlackNotification, formatTestNotification } from "@/lib/notifications/slack";
import { z } from "zod";

const TestNotificationSchema = z.object({
  organizationId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = TestNotificationSchema.parse(body);

    // Verify user is member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: validated.organizationId,
          userId: session.user.id,
        },
      },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    // Get organization settings
    const settings = await prisma.settings.findUnique({
      where: { organizationId: validated.organizationId },
    });

    if (!settings?.slackWebhookUrl) {
      return NextResponse.json({ error: "Slack webhook not configured" }, { status: 400 });
    }

    // Send test notification
    const payload = formatTestNotification(membership.organization.name);
    const success = await sendSlackNotification(settings.slackWebhookUrl, payload);

    if (!success) {
      return NextResponse.json({ error: "Failed to send notification to Slack" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error sending test notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
