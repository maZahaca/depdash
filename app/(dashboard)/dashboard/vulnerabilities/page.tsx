import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VulnerabilityFilters } from "@/components/vulnerability/filters";
import { VulnerabilityTable } from "@/components/vulnerability/vulnerability-table";
import { VulnStatus, Severity } from "@prisma/client";
import { requireViewAccess } from "@/lib/auth-utils";

export default async function VulnerabilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; status?: string }>;
}) {
  const authContext = await requireViewAccess("vulnerabilities");
  const params = await searchParams;

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: authContext.organizationId ?? undefined },
  });

  if (!organization) {
    return <div>No organization found</div>;
  }

  // Build where clause with filters
  const where: any = {
    project: {
      repository: {
        organizationId: authContext.organizationId ?? undefined,
      },
    },
  };

  // Apply severity filter
  if (params.severity) {
    where.advisory = { severity: params.severity as Severity };
  }

  // Apply status filter
  if (params.status) {
    where.status = params.status as VulnStatus;
  } else {
    // Default to open/postponed if no status filter
    where.status = { in: [VulnStatus.OPEN, VulnStatus.POSTPONED] };
  }

  // Fetch vulnerabilities
  const vulnerabilities = await prisma.repositoryVulnerability.findMany({
    where,
    include: {
      advisory: true,
      project: {
        include: {
          repository: true,
        },
      },
    },
    orderBy: {
      fixByDate: "asc",
    },
    take: 50,
  });

  // Calculate stats
  const stats = {
    total: vulnerabilities.length,
    critical: vulnerabilities.filter((v) => v.advisory.severity === "CRITICAL").length,
    high: vulnerabilities.filter((v) => v.advisory.severity === "HIGH").length,
    overdue: vulnerabilities.filter((v) => v.fixByDate < new Date()).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vulnerabilities</h1>
        <p className="text-muted-foreground">
          Organization: {organization.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Open</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.high}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.overdue}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <VulnerabilityFilters />
        </CardContent>
      </Card>

      {/* Vulnerabilities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerabilities</CardTitle>
          <CardDescription>
            Select multiple vulnerabilities to perform bulk actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VulnerabilityTable vulnerabilities={vulnerabilities as any} />
        </CardContent>
      </Card>
    </div>
  );
}
