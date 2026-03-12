import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * Docker parser for Trivy JSON output
 * Run: trivy image --format json <image>
 *
 * Format: JSON with Results array containing vulnerabilities
 */

interface TrivyVulnerability {
  VulnerabilityID: string; // CVE-2023-12345
  PkgName: string;
  InstalledVersion: string;
  FixedVersion?: string;
  Title: string;
  Description: string;
  Severity: string; // CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN
  PrimaryURL?: string;
  References?: string[];
}

interface TrivyResult {
  Target: string;
  Class: string;
  Type: string;
  Vulnerabilities?: TrivyVulnerability[];
}

interface TrivyReport {
  SchemaVersion?: number;
  ArtifactName?: string;
  Results?: TrivyResult[];
}

export class DockerParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const trivyReport = report as TrivyReport;

    if (!trivyReport.Results || !Array.isArray(trivyReport.Results)) {
      throw new Error('Invalid Trivy report format');
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const result of trivyReport.Results) {
      if (!result.Vulnerabilities || result.Vulnerabilities.length === 0) continue;

      for (const vuln of result.Vulnerabilities) {
        const severity = mapTrivySeverity(vuln.Severity);

        // Get advisory URL
        const url = vuln.PrimaryURL ||
                    vuln.References?.[0] ||
                    `https://nvd.nist.gov/vuln/detail/${vuln.VulnerabilityID}`;

        // Build version range
        const versionRange = vuln.FixedVersion
          ? `<${vuln.FixedVersion}`
          : '*';

        // Extract title
        const title = vuln.Title || vuln.Description?.split('\n')[0]?.substring(0, 100) || vuln.VulnerabilityID;

        vulnerabilities.push({
          advisoryId: vuln.VulnerabilityID,
          title,
          severity,
          dependencyName: vuln.PkgName,
          versionRange,
          currentVersion: vuln.InstalledVersion,
          isFixAvailable: !!vuln.FixedVersion,
          fixedVersion: vuln.FixedVersion || undefined,
          cve: vuln.VulnerabilityID.startsWith('CVE-') ? vuln.VulnerabilityID : undefined,
          url,
        });
      }
    }

    return vulnerabilities;
  }
}

function mapTrivySeverity(trivySeverity: string): Severity {
  switch (trivySeverity.toUpperCase()) {
    case 'CRITICAL':
      return Severity.CRITICAL;
    case 'HIGH':
      return Severity.HIGH;
    case 'MEDIUM':
      return Severity.MEDIUM;
    case 'LOW':
      return Severity.LOW;
    case 'UNKNOWN':
    case 'NEGLIGIBLE':
    default:
      return Severity.INFO;
  }
}
