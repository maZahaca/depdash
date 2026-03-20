import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitBranch, GitCommit, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Ecosystem } from "@prisma/client";
import { ScanFilters } from "@/components/scans/scan-filters";
import { requireViewAccess } from "@/lib/auth-utils";

export default async function ScansPage({
  searchParams,
}: {
  searchParams: Promise<{ repository?: string; ecosystem?: string }>;
}) {
  const authContext = await requireViewAccess("scans");
  const params = await searchParams;

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: authContext.organizationId },
  });

  if (!organization) {
    return <div>No organization found</div>;
  }

  // Build where clause with filters
  const where: any = {
    project: {
      repository: {
        organizationId: authContext.organizationId,
      },
    },
  };

  if (params.repository) {
    where.project = {
      ...where.project,
      repository: {
        ...where.project.repository,
        name: params.repository,
      },
    };
  }

  if (params.ecosystem) {
    where.project = {
      ...where.project,
      ecosystem: params.ecosystem as Ecosystem,
    };
  }

  // Fetch scans
  const scans = await prisma.auditScan.findMany({
    where,
    include: {
      project: {
        include: {
          repository: true,
        },
      },
    },
    orderBy: {
      scannedAt: 'desc',
    },
    take: 100,
  });

  // Get unique repositories and ecosystems for filters
  const repositories = await prisma.repository.findMany({
    where: { organizationId: authContext.organizationId },
    select: { name: true },
    orderBy: { name: 'asc' },
  });

  // Calculate stats
  const stats = {
    total: scans.length,
    withNewVulns: scans.filter((s) => s.newCount > 0).length,
    withResolved: scans.filter((s) => s.resolvedCount > 0).length,
    totalVulnsFound: scans.reduce((sum, s) => sum + s.vulnCount, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scan History</h1>
        <p className="text-muted-foreground">
          Organization: {organization.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scans</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New Vulnerabilities</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.withNewVulns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved Issues</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.withResolved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Vulnerabilities</CardDescription>
            <CardTitle className="text-3xl">{stats.totalVulnsFound}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <ScanFilters repositories={repositories} />

      {/* Scans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Last 100 security scans across your repositories</CardDescription>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scans found. Start by running a security scan on your repositories.
            </div>
          ) : (
            <div className="space-y-4">
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {scan.project.repository.name}
                        </h3>
                        <Badge variant="outline">{scan.project.ecosystem}</Badge>
                        {scan.project.path !== '.' && (
                          <span className="text-sm text-muted-foreground">
                            {scan.project.path}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDistanceToNow(new Date(scan.scannedAt), { addSuffix: true })}</span>
                        </div>
                        {scan.branch && (
                          <div className="flex items-center gap-1">
                            <GitBranch className="w-4 h-4" />
                            <span>{scan.branch}</span>
                          </div>
                        )}
                        {scan.commitSha && (
                          <div className="flex items-center gap-1">
                            <GitCommit className="w-4 h-4" />
                            <span className="font-mono">{scan.commitSha.substring(0, 7)}</span>
                          </div>
                        )}
                        {scan.source && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {scan.source}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">
                            <span className="font-semibold">{scan.vulnCount}</span> vulnerabilities found
                          </span>
                        </div>
                        {scan.newCount > 0 && (
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm">
                              <span className="font-semibold text-red-600">{scan.newCount}</span> new
                            </span>
                          </div>
                        )}
                        {scan.resolvedCount > 0 && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              <span className="font-semibold text-green-600">{scan.resolvedCount}</span> resolved
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {scan.jobUrl && (
                      <Link
                        href={scan.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        View Job
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
