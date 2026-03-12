import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VulnStatus, Severity } from "@prisma/client";

export default async function RepositoriesPage() {
  const session = await auth();

  // Get user's first organization
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session!.user!.id },
    include: { organization: true },
  });

  if (!membership) {
    return <div>No organization found</div>;
  }

  // Fetch repositories with projects and vulnerability counts
  const repositories = await prisma.repository.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      projects: {
        include: {
          vulnerabilities: {
            where: { status: VulnStatus.OPEN },
            include: {
              advisory: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Repositories</h1>
        <p className="text-muted-foreground">
          Organization: {membership.organization.name}
        </p>
      </div>

      <div className="grid gap-6">
        {repositories.map((repo) => {
          const totalVulns = repo.projects.reduce((sum, p) => sum + p.vulnerabilities.length, 0);
          const criticalCount = repo.projects.reduce(
            (sum, p) =>
              sum + p.vulnerabilities.filter((v) => v.advisory.severity === Severity.CRITICAL).length,
            0
          );
          const highCount = repo.projects.reduce(
            (sum, p) =>
              sum + p.vulnerabilities.filter((v) => v.advisory.severity === Severity.HIGH).length,
            0
          );

          return (
            <Card key={repo.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{repo.name}</CardTitle>
                    <CardDescription>{repo.projects.length} project(s)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {criticalCount > 0 && (
                      <Badge className="bg-red-600 text-white">
                        {criticalCount} Critical
                      </Badge>
                    )}
                    {highCount > 0 && (
                      <Badge className="bg-orange-600 text-white">
                        {highCount} High
                      </Badge>
                    )}
                    {totalVulns === 0 && (
                      <Badge className="bg-green-600 text-white">✓ No Issues</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {repo.projects.map((project) => {
                    const projectCritical = project.vulnerabilities.filter(
                      (v) => v.advisory.severity === Severity.CRITICAL
                    ).length;
                    const projectHigh = project.vulnerabilities.filter(
                      (v) => v.advisory.severity === Severity.HIGH
                    ).length;
                    const projectMedium = project.vulnerabilities.filter(
                      (v) => v.advisory.severity === Severity.MEDIUM
                    ).length;

                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-gray-600">
                            {project.path}
                          </span>
                          <Badge variant="outline">{project.ecosystem}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {project.dependencyType === "CODE" ? "📦 Code" : "🐳 Docker"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {project.lastScanAt ? (
                            <span className="text-xs text-muted-foreground">
                              Last scan: {new Date(project.lastScanAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No scans yet
                            </span>
                          )}
                          {project.vulnerabilities.length > 0 ? (
                            <div className="flex gap-1">
                              {projectCritical > 0 && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  {projectCritical}C
                                </Badge>
                              )}
                              {projectHigh > 0 && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">
                                  {projectHigh}H
                                </Badge>
                              )}
                              {projectMedium > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  {projectMedium}M
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✓ Clean
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {repositories.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                No repositories found. Start by ingesting your first audit report!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
