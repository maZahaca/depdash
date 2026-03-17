import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const repository = searchParams.get('repository');
    const ecosystem = searchParams.get('ecosystem');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Build where clause
    const where: any = {
      project: {
        repository: {
          organizationId,
        },
      },
    };

    if (repository) {
      where.project.repository.name = repository;
    }

    if (ecosystem) {
      where.project.ecosystem = ecosystem;
    }

    // Fetch scans with project and repository info
    const [scans, total] = await Promise.all([
      prisma.auditScan.findMany({
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
        take: limit,
        skip: offset,
      }),
      prisma.auditScan.count({ where }),
    ]);

    // Transform response
    const data = scans.map((scan) => ({
      id: scan.id,
      scannedAt: scan.scannedAt.toISOString(),
      repository: scan.project.repository.name,
      path: scan.project.path,
      ecosystem: scan.project.ecosystem,
      dependencyType: scan.project.dependencyType,
      source: scan.source,
      jobUrl: scan.jobUrl,
      commitSha: scan.commitSha,
      branch: scan.branch,
      vulnCount: scan.vulnCount,
      newCount: scan.newCount,
      resolvedCount: scan.resolvedCount,
    }));

    return NextResponse.json({
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + scans.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching scans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
