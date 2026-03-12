import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * Ruby parser for bundler-audit JSON output
 * Run: bundle audit --format json
 *
 * Format: JSON with results array containing vulnerabilities
 */

interface RubyVulnerability {
  Name: string;
  Version: string;
  Advisory: string; // CVE-2023-12345 or GHSA-xxxx-xxxx-xxxx
  Criticality?: string; // High, Medium, Low
  URL: string;
  Title: string;
  Solution?: string;
}

interface RubyAuditReport {
  version: string;
  created_at: string;
  results: RubyVulnerability[];
}

export class RubyParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const rubyReport = report as RubyAuditReport;

    if (!rubyReport.results || !Array.isArray(rubyReport.results)) {
      return [];
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const vuln of rubyReport.results) {
      // Determine severity
      const severity = vuln.Criticality
        ? this.mapCriticality(vuln.Criticality)
        : this.inferSeverityFromTitle(vuln.Title);

      // Extract fix version from solution text
      const fixedVersion = this.extractFixVersion(vuln.Solution);

      // Build version range
      const versionRange = fixedVersion
        ? `<${fixedVersion}`
        : `=${vuln.Version}`;

      // Determine if advisory is CVE
      const isCVE = vuln.Advisory.startsWith('CVE-');

      vulnerabilities.push({
        advisoryId: vuln.Advisory,
        title: vuln.Title,
        severity,
        dependencyName: vuln.Name,
        versionRange,
        currentVersion: vuln.Version,
        isFixAvailable: !!fixedVersion,
        fixedVersion,
        cve: isCVE ? vuln.Advisory : undefined,
        url: vuln.URL,
      });
    }

    return vulnerabilities;
  }

  private mapCriticality(criticality: string): Severity {
    const level = criticality.toLowerCase();

    switch (level) {
      case 'critical':
        return Severity.CRITICAL;
      case 'high':
        return Severity.HIGH;
      case 'medium':
      case 'moderate':
        return Severity.MEDIUM;
      case 'low':
        return Severity.LOW;
      default:
        return Severity.MEDIUM;
    }
  }

  private inferSeverityFromTitle(title: string): Severity {
    const lower = title.toLowerCase();

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
      lower.includes('command injection')
    ) {
      return Severity.HIGH;
    }

    if (lower.includes('low')) {
      return Severity.LOW;
    }

    return Severity.MEDIUM;
  }

  private extractFixVersion(solution?: string): string | undefined {
    if (!solution) return undefined;

    // Look for version patterns like "upgrade to >= 1.2.3" or "update to 1.2.3"
    const patterns = [
      /upgrade to >=?\s*(\d+\.\d+\.\d+)/i,
      /update to\s*(\d+\.\d+\.\d+)/i,
      /version\s*(\d+\.\d+\.\d+)/i,
      />=?\s*(\d+\.\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = solution.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }
}
