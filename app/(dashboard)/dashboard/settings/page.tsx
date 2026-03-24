import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireViewAccess, checkEditAccess } from "@/lib/auth-utils";

export default async function SettingsPage() {
  const authContext = await requireViewAccess("settings");

  if (!authContext.organizationId) {
    return <div>No organization selected</div>;
  }

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: authContext.organizationId },
  });

  if (!organization) {
    return <div>No organization found</div>;
  }

  // Check if user can edit
  const canEdit = await checkEditAccess("settings");

  // Get or create settings
  let settings = await prisma.settings.findUnique({
    where: { organizationId: authContext.organizationId },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        organizationId: authContext.organizationId,
        criticalDays: 7,
        highDays: 30,
        mediumDays: 90,
        lowDays: 180,
        retainScansForDays: process.env.RETAIN_SCANS_FOR_DAYS
          ? parseInt(process.env.RETAIN_SCANS_FOR_DAYS)
          : 90,
        retainResolvedForDays: process.env.RETAIN_RESOLVED_FOR_DAYS
          ? parseInt(process.env.RETAIN_RESOLVED_FOR_DAYS)
          : 30,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Organization: {organization.name}
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Fix Timelines</CardTitle>
            <CardDescription>
              Configure the number of days to fix vulnerabilities by severity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              settings={{
                criticalDays: settings.criticalDays,
                highDays: settings.highDays,
                mediumDays: settings.mediumDays,
                lowDays: settings.lowDays,
                retainScansForDays: settings.retainScansForDays,
                retainResolvedForDays: settings.retainResolvedForDays,
              }}
              organizationId={authContext.organizationId}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
            <CardDescription>
              Configure how long to keep scan records and resolved vulnerabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Scan Records:</strong>{" "}
                {settings.retainScansForDays
                  ? `${settings.retainScansForDays} days`
                  : "Keep forever"}
              </p>
              <p>
                <strong>Resolved Vulnerabilities:</strong>{" "}
                {settings.retainResolvedForDays
                  ? `${settings.retainResolvedForDays} days`
                  : "Keep forever"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
