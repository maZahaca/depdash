import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Severity, VulnStatus, Ecosystem, DependencyType } from '@prisma/client';

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

    // Verify user has access to organization
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

    // Build filters
    const where: any = {
      project: {
        repository: {
          organizationId,
        },
      },
    };

    // Filter by repository
    if (searchParams.get('repository')) {
      where.project.repository.name = searchParams.get('repository');
    }

    // Filter by path
    if (searchParams.get('path')) {
      where.project.path = searchParams.get('path');
    }

    // Filter by ecosystem
    if (searchParams.get('ecosystem')) {
      where.project.ecosystem = searchParams.get('ecosystem') as Ecosystem;
    }

    // Filter by dependency type
    if (searchParams.get('dependencyType')) {
      where.project.dependencyType = searchParams.get('dependencyType') as DependencyType;
    }

    // Filter by severity
    const severities = searchParams.getAll('severity');
    if (severities.length > 0) {
      where.advisory = { severity: { in: severities as Severity[] } };
    }

    // Filter by status
    const statuses = searchParams.getAll('status');
    if (statuses.length > 0) {
      where.status = { in: statuses as VulnStatus[] };
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'fixByDate';
    const order = searchParams.get('order') || 'asc';

    const orderBy: any = {};
    if (sortBy === 'severity') {
      orderBy.advisory = { severity: order };
    } else if (sortBy === 'detectedAt') {
      orderBy.firstSeenAt = order;
    } else {
      orderBy[sortBy] = order;
    }

    // Fetch vulnerabilities
    const [vulnerabilities, total] = await Promise.all([
      prisma.repositoryVulnerability.findMany({
        where,
        include: {
          advisory: true,
          project: {
            include: {
              repository: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.repositoryVulnerability.count({ where }),
    ]);

    // Transform response
    const data = vulnerabilities.map((vuln) => ({
      id: vuln.id,
      repository: vuln.project.repository.name,
      path: vuln.project.path,
      ecosystem: vuln.project.ecosystem,
      dependencyType: vuln.project.dependencyType,
      dependency: vuln.dependencyName,
      title: vuln.advisory.title,
      url: vuln.advisory.url,
      severity: vuln.advisory.severity,
      isFixAvailable: vuln.isFixAvailable,
      versionRange: vuln.versionRange,
      currentVersion: vuln.currentVersion,
      fixedVersion: vuln.fixedVersion,
      detectedAt: vuln.firstSeenAt.toISOString(),
      fixByDate: vuln.fixByDate.toISOString(),
      daysRemaining: Math.ceil((vuln.fixByDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      status: vuln.status,
    }));

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
