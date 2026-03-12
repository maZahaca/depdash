import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { VulnStatus, Severity } from "@prisma/client";
import { subDays, startOfDay, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const organizationId = membership.organizationId;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Calculate date range
    const endDate = new Date();
    const startDate = startOfDay(subDays(endDate, days));

    // Get vulnerability trends over time
    const vulnerabilityTrends = await getVulnerabilityTrends(organizationId, startDate, endDate);

    // Get resolution statistics
    const resolutionStats = await getResolutionStats(organizationId, startDate, endDate);

    // Get severity distribution
    const severityDistribution = await getSeverityDistribution(organizationId);

    // Get status distribution
    const statusDistribution = await getStatusDistribution(organizationId);

    // Get top repositories by vulnerability count
    const topRepositories = await getTopRepositories(organizationId, 10);

    // Get resolution time metrics
    const resolutionTimeMetrics = await getResolutionTimeMetrics(organizationId, startDate, endDate);

    // Get ecosystem breakdown
    const ecosystemBreakdown = await getEcosystemBreakdown(organizationId);

    return NextResponse.json({
      vulnerabilityTrends,
      resolutionStats,
      severityDistribution,
      statusDistribution,
      topRepositories,
      resolutionTimeMetrics,
      ecosystemBreakdown,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getVulnerabilityTrends(organizationId: string, startDate: Date, endDate: Date) {
  // Get daily counts of vulnerabilities by status
  const scans = await prisma.auditScan.findMany({
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      scannedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      scannedAt: "asc",
    },
    select: {
      scannedAt: true,
      vulnCount: true,
      newCount: true,
      resolvedCount: true,
    },
  });

  // Group by date
  const trendMap = new Map<string, { date: string; total: number; new: number; resolved: number }>();

  for (const scan of scans) {
    const dateKey = format(scan.scannedAt, "yyyy-MM-dd");
    const existing = trendMap.get(dateKey) || { date: dateKey, total: 0, new: 0, resolved: 0 };

    existing.total += scan.vulnCount;
    existing.new += scan.newCount;
    existing.resolved += scan.resolvedCount;

    trendMap.set(dateKey, existing);
  }

  return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function getResolutionStats(organizationId: string, startDate: Date, endDate: Date) {
  const resolved = await prisma.repositoryVulnerability.count({
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      status: VulnStatus.RESOLVED,
      resolvedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const acceptedRisk = await prisma.repositoryVulnerability.count({
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      status: VulnStatus.ACCEPTED_RISK,
      statusChangedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const falsePositive = await prisma.repositoryVulnerability.count({
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      status: VulnStatus.FALSE_POSITIVE,
      statusChangedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const wontFix = await prisma.repositoryVulnerability.count({
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      status: VulnStatus.WONT_FIX,
      statusChangedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return {
    resolved,
    acceptedRisk,
    falsePositive,
    wontFix,
    total: resolved + acceptedRisk + falsePositive + wontFix,
  };
}

async function getSeverityDistribution(organizationId: string) {
  const vulns = await prisma.repositoryVulnerability.groupBy({
    by: ["status"],
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      status: {
        in: [VulnStatus.OPEN, VulnStatus.POSTPONED],
      },
    },
    _count: true,
  });

  // Get severity breakdown for open/postponed vulns
  const severityData = await prisma.repositoryVulnerability.findMany({
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      status: {
        in: [VulnStatus.OPEN, VulnStatus.POSTPONED],
      },
    },
    include: {
      advisory: {
        select: {
          severity: true,
        },
      },
    },
  });

  const distribution = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };

  for (const vuln of severityData) {
    distribution[vuln.advisory.severity]++;
  }

  return Object.entries(distribution).map(([severity, count]) => ({
    severity,
    count,
  }));
}

async function getStatusDistribution(organizationId: string) {
  const distribution = await prisma.repositoryVulnerability.groupBy({
    by: ["status"],
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
    },
    _count: true,
  });

  return distribution.map((item) => ({
    status: item.status,
    count: item._count,
  }));
}

async function getTopRepositories(organizationId: string, limit: number) {
  const repos = await prisma.repository.findMany({
    where: {
      organizationId,
    },
    include: {
      projects: {
        include: {
          _count: {
            select: {
              vulnerabilities: {
                where: {
                  status: {
                    in: [VulnStatus.OPEN, VulnStatus.POSTPONED],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const repoStats = repos.map((repo) => ({
    name: repo.name,
    totalVulns: repo.projects.reduce((sum, project) => sum + project._count.vulnerabilities, 0),
  }));

  return repoStats
    .sort((a, b) => b.totalVulns - a.totalVulns)
    .slice(0, limit);
}

async function getResolutionTimeMetrics(organizationId: string, startDate: Date, endDate: Date) {
  const resolvedVulns = await prisma.repositoryVulnerability.findMany({
    where: {
      project: {
        repository: {
          organizationId,
        },
      },
      status: VulnStatus.RESOLVED,
      resolvedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      firstSeenAt: true,
      resolvedAt: true,
    },
  });

  if (resolvedVulns.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      minDays: 0,
      maxDays: 0,
    };
  }

  const resolutionTimes = resolvedVulns.map((vuln) => {
    const diff = vuln.resolvedAt!.getTime() - vuln.firstSeenAt.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); // Convert to days
  });

  resolutionTimes.sort((a, b) => a - b);

  const average = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
  const median = resolutionTimes[Math.floor(resolutionTimes.length / 2)];

  return {
    averageDays: Math.round(average * 10) / 10,
    medianDays: median,
    minDays: Math.min(...resolutionTimes),
    maxDays: Math.max(...resolutionTimes),
  };
}

async function getEcosystemBreakdown(organizationId: string) {
  const projects = await prisma.project.findMany({
    where: {
      repository: {
        organizationId,
      },
    },
    include: {
      _count: {
        select: {
          vulnerabilities: {
            where: {
              status: {
                in: [VulnStatus.OPEN, VulnStatus.POSTPONED],
              },
            },
          },
        },
      },
    },
  });

  const ecosystemMap = new Map<string, number>();

  for (const project of projects) {
    const existing = ecosystemMap.get(project.ecosystem) || 0;
    ecosystemMap.set(project.ecosystem, existing + project._count.vulnerabilities);
  }

  return Array.from(ecosystemMap.entries()).map(([ecosystem, count]) => ({
    ecosystem,
    count,
  }));
}
