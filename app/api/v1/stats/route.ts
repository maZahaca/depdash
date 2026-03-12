import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { VulnStatus, Severity } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId required' }, { status: 400 });
    }

    // Verify user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Aggregate stats
    const [totalVulns, openVulns, criticalVulns, overdueVulns, newLast24h, resolvedLast24h, repositories, lastScan] =
      await Promise.all([
        // Total vulnerabilities
        prisma.repositoryVulnerability.count({
          where: {
            project: {
              repository: {
                organizationId,
              },
            },
          },
        }),
        // Open vulnerabilities
        prisma.repositoryVulnerability.count({
          where: {
            project: {
              repository: {
                organizationId,
              },
            },
            status: VulnStatus.OPEN,
          },
        }),
        // Critical vulnerabilities
        prisma.repositoryVulnerability.count({
          where: {
            project: {
              repository: {
                organizationId,
              },
            },
            status: VulnStatus.OPEN,
            advisory: {
              severity: Severity.CRITICAL,
            },
          },
        }),
        // Overdue vulnerabilities
        prisma.repositoryVulnerability.count({
          where: {
            project: {
              repository: {
                organizationId,
              },
            },
            status: VulnStatus.OPEN,
            fixByDate: {
              lt: now,
            },
          },
        }),
        // New in last 24h
        prisma.repositoryVulnerability.count({
          where: {
            project: {
              repository: {
                organizationId,
              },
            },
            firstSeenAt: {
              gte: last24h,
            },
          },
        }),
        // Resolved in last 24h
        prisma.repositoryVulnerability.count({
          where: {
            project: {
              repository: {
                organizationId,
              },
            },
            status: VulnStatus.RESOLVED,
            resolvedAt: {
              gte: last24h,
            },
          },
        }),
        // Repository count
        prisma.repository.count({
          where: { organizationId },
        }),
        // Last scan
        prisma.auditScan.findFirst({
          where: {
            project: {
              repository: {
                organizationId,
              },
            },
          },
          orderBy: {
            scannedAt: 'desc',
          },
        }),
      ]);

    return NextResponse.json({
      totalVulns,
      openVulns,
      criticalVulns,
      overdueVulns,
      newLast24h,
      resolvedLast24h,
      repositories,
      lastScan: lastScan?.scannedAt.toISOString() || null,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
