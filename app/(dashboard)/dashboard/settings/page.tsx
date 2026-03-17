import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { notFound } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  // Get user's first organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session!.user!.id },
    include: { organization: true },
  });

  if (!membership) {
    return <div>No organization found</div>;
  }

  // Get or create settings
  let settings = await prisma.settings.findUnique({
    where: { organizationId: membership.organizationId },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        organizationId: membership.organizationId,
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
          Organization: {membership.organization.name}
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
              organizationId={membership.organizationId}
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
