import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * Python parser for pip-audit JSON output
 * Run: pip-audit --format json
 *
 * Format: JSON with dependencies array
 */

interface PipAuditVulnerability {
  id: string; // e.g., "PYSEC-2023-123" or "GHSA-xxxx-xxxx-xxxx"
  fix_versions: string[];
  aliases: string[];
  description: string;
}

interface PipAuditDependency {
  name: string;
  version: string;
  vulns: PipAuditVulnerability[];
}

interface PipAuditReport {
  dependencies: PipAuditDependency[];
}

export class PythonParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const auditReport = report as PipAuditReport;

    if (!auditReport.dependencies || !Array.isArray(auditReport.dependencies)) {
      throw new Error('Invalid pip-audit report format');
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const dep of auditReport.dependencies) {
      if (!dep.vulns || dep.vulns.length === 0) continue;

      for (const vuln of dep.vulns) {
        // Extract CVE from aliases
        const cve = vuln.aliases?.find((alias) => alias.startsWith('CVE-'));

        // Determine severity from ID or default to MEDIUM
        // PYSEC and GHSA don't include severity in pip-audit output
        // In production, you might want to fetch CVSS scores
        const severity = inferSeverityFromDescription(vuln.description);

        // Get first fix version
        const fixedVersion = vuln.fix_versions?.[0] || undefined;

        // Build advisory URL
        const url = buildAdvisoryUrl(vuln.id);

        // Extract title from description (first sentence)
        const title = vuln.description.split('.')[0] || vuln.description.substring(0, 100);

        vulnerabilities.push({
          advisoryId: vuln.id,
          title,
          severity,
          dependencyName: dep.name,
          versionRange: fixedVersion ? `<${fixedVersion}` : '*',
          currentVersion: dep.version,
          isFixAvailable: !!fixedVersion,
          fixedVersion,
          cve: cve || undefined,
          url,
        });
      }
    }

    return vulnerabilities;
  }
}

function inferSeverityFromDescription(description: string): Severity {
  const lower = description.toLowerCase();

  // Look for severity keywords
  if (
    lower.includes('critical') ||
    lower.includes('remote code execution') ||
    lower.includes('arbitrary code')
  ) {
    return Severity.CRITICAL;
  }

  if (
    lower.includes('high') ||
    lower.includes('sql injection') ||
    lower.includes('authentication bypass')
  ) {
    return Severity.HIGH;
  }

  if (lower.includes('low')) {
    return Severity.LOW;
  }

  // Default to MEDIUM
  return Severity.MEDIUM;
}

function buildAdvisoryUrl(advisoryId: string): string {
  if (advisoryId.startsWith('PYSEC-')) {
    return `https://osv.dev/vulnerability/${advisoryId}`;
  }

  if (advisoryId.startsWith('GHSA-')) {
    return `https://github.com/advisories/${advisoryId}`;
  }

  if (advisoryId.startsWith('CVE-')) {
    const year = advisoryId.split('-')[1];
    const id = advisoryId.split('-')[2];
    return `https://nvd.nist.gov/vuln/detail/CVE-${year}-${id}`;
  }

  return `https://osv.dev/vulnerability/${advisoryId}`;
}
