import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * Swift parser for swift package audit output (JSON)
 * Run: swift package audit --format json (experimental feature)
 *
 * Note: As of Swift 5.9+, this is an experimental feature
 * Alternative: Parse swift-outdated or manually check package vulnerabilities
 *
 * Format: JSON with vulnerabilities array
 */

interface SwiftVulnerability {
  id: string; // Advisory ID (e.g., GHSA-xxxx-xxxx-xxxx)
  summary: string;
  details?: string;
  severity?: string; // critical | high | moderate | low
  cve?: string;
  url?: string;
  package: {
    name: string;
    version: string;
  };
  fixed_version?: string;
  patched_versions?: string[];
}

interface SwiftAuditReport {
  vulnerabilities?: SwiftVulnerability[];
}

export class SwiftParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const swiftReport = report as SwiftAuditReport;

    if (!swiftReport.vulnerabilities) {
      return [];
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const vuln of swiftReport.vulnerabilities) {
      // Determine severity
      const severity = vuln.severity
        ? this.mapSeverity(vuln.severity)
        : Severity.MEDIUM;

      // Get fixed version
      const fixedVersion = vuln.fixed_version ||
                          (vuln.patched_versions && vuln.patched_versions[0]) ||
                          undefined;

      // Build advisory URL
      const url = vuln.url ||
                  (vuln.id.startsWith('GHSA-')
                    ? `https://github.com/advisories/${vuln.id}`
                    : `https://osv.dev/vulnerability/${vuln.id}`);

      // Build version range
      const versionRange = fixedVersion
        ? `<${fixedVersion}`
        : `=${vuln.package.version}`;

      vulnerabilities.push({
        advisoryId: vuln.id,
        title: vuln.summary,
        severity,
        dependencyName: vuln.package.name,
        versionRange,
        currentVersion: vuln.package.version,
        isFixAvailable: !!fixedVersion,
        fixedVersion,
        cve: vuln.cve || undefined,
        url,
      });
    }

    return vulnerabilities;
  }

  private mapSeverity(swiftSeverity: string): Severity {
    const severity = swiftSeverity.toLowerCase();

    switch (severity) {
      case 'critical':
        return Severity.CRITICAL;
      case 'high':
        return Severity.HIGH;
      case 'moderate':
      case 'medium':
        return Severity.MEDIUM;
      case 'low':
        return Severity.LOW;
      default:
        return Severity.MEDIUM;
    }
  }
}
