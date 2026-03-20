import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiTokenList } from "@/components/integrations/api-token-list";
import { SlackWebhookForm } from "@/components/integrations/slack-webhook-form";
import { requireViewAccess, checkEditAccess } from "@/lib/auth-utils";

export default async function IntegrationsPage() {
  const authContext = await requireViewAccess("integrations");

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: authContext.organizationId },
  });

  if (!organization) {
    return <div>No organization found</div>;
  }

  // Check if user can edit
  const canEdit = await checkEditAccess("integrations");

  // Fetch API tokens
  const tokens = await prisma.apiToken.findMany({
    where: { organizationId: authContext.organizationId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch organization settings for Slack webhook
  const settings = await prisma.settings.findUnique({
    where: { organizationId: authContext.organizationId },
    select: { slackWebhookUrl: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Organization: {organization.name}
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
          <ApiTokenList tokens={tokens} organizationId={authContext.organizationId} canEdit={canEdit} />
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
            organizationId={authContext.organizationId}
            initialWebhookUrl={settings?.slackWebhookUrl || ""}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
