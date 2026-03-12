import { z } from 'zod';
import { Ecosystem, DependencyType } from '@prisma/client';

export const AuditIngestSchema = z.object({
  organizationId: z.string().uuid(),
  repository: z.string().min(1),
  path: z.string().default('.'),
  ecosystem: z.nativeEnum(Ecosystem),
  dependencyType: z.nativeEnum(DependencyType).default(DependencyType.CODE),
  report: z.unknown(),
  imageName: z.string().optional(),
  imageDigest: z.string().optional(),
  scanSource: z.enum(['github-actions', 'gitlab-ci', 'jenkins', 'manual']).optional(),
  scanJobUrl: z.string().url().optional(),
  commitSha: z.string().optional(),
  branch: z.string().optional(),
});

export type AuditIngestInput = z.infer<typeof AuditIngestSchema>;
