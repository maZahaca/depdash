import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { VulnStatus } from '@prisma/client';
import { z } from 'zod';

const BulkUpdateSchema = z
  .object({
    vulnerabilityIds: z.array(z.string().cuid()),
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = BulkUpdateSchema.parse(body);

    // Verify all vulnerabilities belong to user's organizations
    const vulnerabilities = await prisma.repositoryVulnerability.findMany({
      where: {
        id: { in: validated.vulnerabilityIds },
      },
      include: {
        project: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (vulnerabilities.length === 0) {
      return NextResponse.json({ error: 'No vulnerabilities found' }, { status: 404 });
    }

    // Get unique organization IDs
    const orgIds = [...new Set(vulnerabilities.map((v) => v.project.repository.organizationId))];

    // Verify user has access to all organizations
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: session.user.id,
        organizationId: { in: orgIds },
      },
    });

    if (memberships.length !== orgIds.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update all vulnerabilities
    const failures: Array<{ id: string; error: string }> = [];
    let updatedCount = 0;

    for (const vulnId of validated.vulnerabilityIds) {
      try {
        await prisma.repositoryVulnerability.update({
          where: { id: vulnId },
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
        updatedCount++;
      } catch (error) {
        failures.push({
          id: vulnId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount,
        failedCount: failures.length,
        failures: failures.length > 0 ? failures : undefined,
      },
    });
  } catch (error) {
    console.error('Error bulk updating vulnerabilities:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request body', details: error }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
