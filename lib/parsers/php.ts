import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * PHP parser for composer audit JSON output
 * Run: composer audit --format=json
 *
 * Format: JSON with advisories object containing package vulnerabilities
 */

interface PHPAdvisory {
  advisoryId: string;
  packageName: string;
  title: string;
  link: string;
  cve?: string;
  affectedVersions: string;
  sources: Array<{
    name: string;
    remoteId: string;
  }>;
}

interface PHPAuditReport {
  advisories: {
    [packageName: string]: PHPAdvisory[];
  };
}

export class PHPParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const phpReport = report as PHPAuditReport;

    if (!phpReport.advisories) {
      return [];
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const [packageName, advisories] of Object.entries(phpReport.advisories)) {
      for (const advisory of advisories) {
        // Infer severity from title or default to MEDIUM
        const severity = this.inferSeverity(advisory.title);

        // Extract current version from affected versions range
        const currentVersion = this.extractCurrentVersion(advisory.affectedVersions);

        // Try to extract fix version
        const fixedVersion = this.extractFixVersion(advisory.affectedVersions);

        vulnerabilities.push({
          advisoryId: advisory.advisoryId,
          title: advisory.title,
          severity,
          dependencyName: packageName,
          versionRange: advisory.affectedVersions,
          currentVersion: currentVersion || 'unknown',
          isFixAvailable: !!fixedVersion,
          fixedVersion,
          cve: advisory.cve || undefined,
          url: advisory.link,
        });
      }
    }

    return vulnerabilities;
  }

  private inferSeverity(title: string): Severity {
    const lower = title.toLowerCase();

    if (
      lower.includes('critical') ||
      lower.includes('remote code execution') ||
      lower.includes('arbitrary code execution')
    ) {
      return Severity.CRITICAL;
    }

    if (
      lower.includes('high') ||
      lower.includes('sql injection') ||
      lower.includes('command injection') ||
      lower.includes('xss') ||
      lower.includes('cross-site scripting')
    ) {
      return Severity.HIGH;
    }

    if (
      lower.includes('low') ||
      lower.includes('information disclosure')
    ) {
      return Severity.LOW;
    }

    if (lower.includes('medium') || lower.includes('moderate')) {
      return Severity.MEDIUM;
    }

    // Default to MEDIUM
    return Severity.MEDIUM;
  }

  private extractCurrentVersion(affectedVersions: string): string | undefined {
    // Try to extract a specific version from ranges like ">=1.0.0,<1.2.3"
    const match = affectedVersions.match(/[>=<]*(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  }

  private extractFixVersion(affectedVersions: string): string | undefined {
    // Look for patterns like "<1.2.3" which means 1.2.3 is the fix
    const lessThanMatch = affectedVersions.match(/<(\d+\.\d+\.\d+)/);
    if (lessThanMatch) {
      return lessThanMatch[1];
    }

    // Look for patterns like ">=1.0.0,<1.2.3" - the upper bound is the fix
    const rangeMatch = affectedVersions.match(/>=[\d.]+,<(\d+\.\d+\.\d+)/);
    if (rangeMatch) {
      return rangeMatch[1];
    }

    return undefined;
  }
}
