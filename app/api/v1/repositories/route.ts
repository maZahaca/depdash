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

    // Fetch repositories with projects
    const repositories = await prisma.repository.findMany({
      where: { organizationId },
      include: {
        projects: {
          include: {
            _count: {
              select: {
                vulnerabilities: {
                  where: { status: VulnStatus.OPEN },
                },
              },
            },
            vulnerabilities: {
              where: { status: VulnStatus.OPEN },
              include: {
                advisory: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform response
    const data = repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      projects: repo.projects.map((project) => {
        const criticalCount = project.vulnerabilities.filter((v) => v.advisory.severity === Severity.CRITICAL).length;
        const highCount = project.vulnerabilities.filter((v) => v.advisory.severity === Severity.HIGH).length;

        return {
          id: project.id,
          path: project.path,
          ecosystem: project.ecosystem,
          dependencyType: project.dependencyType,
          lastScanAt: project.lastScanAt?.toISOString() || null,
          openVulnCount: project._count.vulnerabilities,
          criticalCount,
          highCount,
        };
      }),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
