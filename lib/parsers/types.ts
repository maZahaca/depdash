import { Severity } from '@prisma/client';

export interface ParsedVulnerability {
  advisoryId: string;
  title: string;
  url?: string;
  severity: Severity;
  cve?: string;
  dependencyName: string;
  versionRange: string;
  currentVersion?: string;
  isFixAvailable: boolean;
  fixedVersion?: string;
}

export interface AuditParser {
  parse(report: unknown): ParsedVulnerability[];
}
