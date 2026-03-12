import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import prisma from '@/lib/prisma';

export async function validateApiToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  // Hash the provided token
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Find token by hash
  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!apiToken) {
    return null;
  }

  // Update last used timestamp
  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });

  return apiToken.organizationId;
}
