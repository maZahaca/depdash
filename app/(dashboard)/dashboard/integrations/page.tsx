import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiTokenList } from "@/components/integrations/api-token-list";
import { SlackWebhookForm } from "@/components/integrations/slack-webhook-form";
import { notFound } from "next/navigation";

export default async function IntegrationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  // Get user's first organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    return <div>No organization found</div>;
  }

  // Check access - only non-VIEWER roles can access
  if (membership.role === "VIEWER") {
    notFound();
  }

  // Fetch API tokens
  const tokens = await prisma.apiToken.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch organization settings for Slack webhook
  const settings = await prisma.settings.findUnique({
    where: { organizationId: membership.organizationId },
    select: { slackWebhookUrl: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Organization: {membership.organization.name}
        </p>
      </div>

      {/* API Tokens Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Tokens</CardTitle>
          <CardDescription>
            Generate API tokens to ingest audit reports from your CI/CD pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiTokenList tokens={tokens} organizationId={membership.organizationId} />
        </CardContent>
      </Card>

      {/* Slack Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Slack Notifications</CardTitle>
          <CardDescription>
            Configure Slack webhook to receive notifications for new vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SlackWebhookForm
            organizationId={membership.organizationId}
            initialWebhookUrl={settings?.slackWebhookUrl || ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
