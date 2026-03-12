import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/vulnerability/severity-badge";
import { StatusBadge } from "@/components/vulnerability/status-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function VulnerabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const vulnerability = await prisma.repositoryVulnerability.findUnique({
    where: { id },
    include: {
      advisory: true,
      project: {
        include: {
          repository: {
            include: {
              organization: true,
            },
          },
        },
      },
    },
  });

  if (!vulnerability) {
    notFound();
  }

  // Verify user has access
  if (!session?.user?.id) {
    notFound();
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: vulnerability.project.repository.organizationId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    notFound();
  }

  const daysLeft = Math.ceil(
    (vulnerability.fixByDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = daysLeft < 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/vulnerabilities"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to Vulnerabilities
          </Link>
          <h1 className="text-3xl font-bold mt-2">{vulnerability.advisory.title}</h1>
        </div>
        <div className="flex gap-2">
          <SeverityBadge severity={vulnerability.advisory.severity} />
          <StatusBadge status={vulnerability.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Advisory ID</div>
              <div className="text-sm">{vulnerability.advisory.advisoryId}</div>
            </div>
            {vulnerability.advisory.cve && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">CVE</div>
                <div className="text-sm">{vulnerability.advisory.cve}</div>
              </div>
            )}
            {vulnerability.advisory.url && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">URL</div>
                <a
                  href={vulnerability.advisory.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {vulnerability.advisory.url}
                </a>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Severity</div>
              <div className="mt-1">
                <SeverityBadge severity={vulnerability.advisory.severity} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dependency Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Package Name</div>
              <div className="text-sm font-mono">{vulnerability.dependencyName}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Current Version</div>
              <div className="text-sm font-mono">
                {vulnerability.currentVersion || "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Vulnerable Range
              </div>
              <div className="text-sm font-mono">{vulnerability.versionRange}</div>
            </div>
            {vulnerability.isFixAvailable && vulnerability.fixedVersion && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Fixed Version
                </div>
                <div className="text-sm font-mono text-green-600">
                  {vulnerability.fixedVersion}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Repository</div>
              <div className="text-sm">{vulnerability.project.repository.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Path</div>
              <div className="text-sm font-mono">{vulnerability.project.path}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Ecosystem</div>
              <div className="text-sm">{vulnerability.project.ecosystem}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div className="text-sm">
                {vulnerability.project.dependencyType === "CODE" ? "📦 Code" : "🐳 Docker"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">First Detected</div>
              <div className="text-sm">{vulnerability.firstSeenAt.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Seen</div>
              <div className="text-sm">{vulnerability.lastSeenAt.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Fix By Date</div>
              <div
                className={`text-sm font-medium ${
                  isOverdue ? "text-red-600" : daysLeft < 7 ? "text-orange-600" : ""
                }`}
              >
                {vulnerability.fixByDate.toLocaleDateString()}
                {isOverdue && ` (${Math.abs(daysLeft)} days overdue)`}
                {!isOverdue && ` (${daysLeft} days left)`}
              </div>
            </div>
            {vulnerability.resolvedAt && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Resolved At</div>
                <div className="text-sm text-green-600">
                  {vulnerability.resolvedAt.toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {vulnerability.statusNote && (
        <Card>
          <CardHeader>
            <CardTitle>Status Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{vulnerability.statusNote}</p>
            {vulnerability.statusChangedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Changed on {vulnerability.statusChangedAt.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {vulnerability.scanJobUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vulnerability.scanSource && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Source: </span>
                <span className="text-sm">{vulnerability.scanSource}</span>
              </div>
            )}
            <div>
              <a
                href={vulnerability.scanJobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View Scan Job →
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
