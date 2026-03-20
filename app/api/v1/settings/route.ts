import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireApiViewAccess, requireApiEditAccess } from '@/lib/api-auth';

const UpdateSettingsSchema = z.object({
  criticalDays: z.number().int().positive().optional(),
  highDays: z.number().int().positive().optional(),
  mediumDays: z.number().int().positive().optional(),
  lowDays: z.number().int().positive().optional(),
  retainScansForDays: z.number().int().positive().nullable().optional(),
  retainResolvedForDays: z.number().int().positive().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireApiViewAccess(request, 'settings');
    if (authContext instanceof NextResponse) {
      return authContext;
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId || organizationId !== authContext.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create settings
    let settings = await prisma.settings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          organizationId,
          criticalDays: 7,
          highDays: 30,
          mediumDays: 90,
          lowDays: 180,
        },
      });
    }

    return NextResponse.json({
      criticalDays: settings.criticalDays,
      highDays: settings.highDays,
      mediumDays: settings.mediumDays,
      lowDays: settings.lowDays,
      retainScansForDays: settings.retainScansForDays,
      retainResolvedForDays: settings.retainResolvedForDays,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await requireApiEditAccess(request, 'settings');
    if (authContext instanceof NextResponse) {
      return authContext;
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId || organizationId !== authContext.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validated = UpdateSettingsSchema.parse(body);

    // Update settings
    const settings = await prisma.settings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        criticalDays: validated.criticalDays ?? 7,
        highDays: validated.highDays ?? 30,
        mediumDays: validated.mediumDays ?? 90,
        lowDays: validated.lowDays ?? 180,
        retainScansForDays: validated.retainScansForDays,
        retainResolvedForDays: validated.retainResolvedForDays,
      },
      update: validated,
    });

    return NextResponse.json({
      success: true,
      data: {
        criticalDays: settings.criticalDays,
        highDays: settings.highDays,
        mediumDays: settings.mediumDays,
        lowDays: settings.lowDays,
        retainScansForDays: settings.retainScansForDays,
        retainResolvedForDays: settings.retainResolvedForDays,
      },
    });
  } catch (error) {
    console.error('Error updating settings:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request body', details: error }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
