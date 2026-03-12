import { NextRequest, NextResponse } from 'next/server';
import { AuditIngestSchema } from '@/lib/validators/audit';
import { processAudit } from '@/lib/audit/processor';
import { validateApiToken } from '@/lib/api/auth';

export async function POST(request: NextRequest) {
  try {
    // Validate API token
    const organizationId = await validateApiToken(request);

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = AuditIngestSchema.parse(body);

    // Verify organizationId matches token
    if (validated.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization mismatch' },
        { status: 403 }
      );
    }

    // Process audit report
    const result = await processAudit({
      ...validated,
      report: validated.report!,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Audit ingestion error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
