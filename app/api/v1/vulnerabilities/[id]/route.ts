import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { VulnStatus } from '@prisma/client';
import { z } from 'zod';

// GET single vulnerability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Verify user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: vulnerability.project.repository.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: vulnerability.id,
      project: {
        id: vulnerability.project.id,
        path: vulnerability.project.path,
        ecosystem: vulnerability.project.ecosystem,
        repository: {
          id: vulnerability.project.repository.id,
          name: vulnerability.project.repository.name,
        },
      },
      advisory: {
        advisoryId: vulnerability.advisory.advisoryId,
        title: vulnerability.advisory.title,
        url: vulnerability.advisory.url,
        severity: vulnerability.advisory.severity,
        cve: vulnerability.advisory.cve,
      },
      dependency: vulnerability.dependencyName,
      versionRange: vulnerability.versionRange,
      currentVersion: vulnerability.currentVersion,
      isFixAvailable: vulnerability.isFixAvailable,
      fixedVersion: vulnerability.fixedVersion,
      firstSeenAt: vulnerability.firstSeenAt.toISOString(),
      lastSeenAt: vulnerability.lastSeenAt.toISOString(),
      fixByDate: vulnerability.fixByDate.toISOString(),
      status: vulnerability.status,
      resolvedAt: vulnerability.resolvedAt?.toISOString() || null,
      statusChangedAt: vulnerability.statusChangedAt?.toISOString() || null,
      statusChangedBy: vulnerability.statusChangedBy,
      statusNote: vulnerability.statusNote,
      postponedUntil: vulnerability.postponedUntil?.toISOString() || null,
      scanSource: vulnerability.scanSource,
      scanJobUrl: vulnerability.scanJobUrl,
    });
  } catch (error) {
    console.error('Error fetching vulnerability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update vulnerability status
const UpdateVulnStatusSchema = z
  .object({
    status: z.enum(['ACCEPTED_RISK', 'FALSE_POSITIVE', 'POSTPONED', 'WONT_FIX', 'RESOLVED', 'OPEN']),
    note: z.string().optional(),
    postponedUntil: z.string().datetime().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'POSTPONED') {
        return data.postponedUntil !== undefined;
      }
      return true;
    },
    { message: 'postponedUntil is required for POSTPONED status' }
  );

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get vulnerability and verify access
    const vulnerability = await prisma.repositoryVulnerability.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (!vulnerability) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validated = UpdateVulnStatusSchema.parse(body);

    // Update vulnerability
    const updated = await prisma.repositoryVulnerability.update({
      where: { id },
      data: {
        status: validated.status as VulnStatus,
        statusChangedAt: new Date(),
        statusChangedBy: session.user.id,
        statusNote: validated.note || null,
        postponedUntil:
          validated.status === 'POSTPONED'
            ? validated.postponedUntil
              ? new Date(validated.postponedUntil)
              : null
            : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        statusChangedAt: updated.statusChangedAt?.toISOString(),
        statusChangedBy: updated.statusChangedBy,
        statusNote: updated.statusNote,
        postponedUntil: updated.postponedUntil?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error updating vulnerability:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request body', details: error }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
