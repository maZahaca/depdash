import { Severity } from '@prisma/client';
import { AuditParser, ParsedVulnerability } from './types';

interface NpmVia {
  title: string;
  url?: string;
  range?: string;
  source?: number;
  name?: string;
  dependency?: string;
  severity?: string;
  cwe?: string[];
  cvss?: {
    score: number;
    vectorString: string;
  };
  via?: string | NpmVia[];
}

interface NpmVulnerability {
  name: string;
  severity: string;
  isDirect: boolean;
  via: (string | NpmVia)[];
  effects: string[];
  range: string;
  nodes?: string[];
  fixAvailable: boolean | {
    name: string;
    version: string;
    isSemVerMajor: boolean;
  };
}

interface NpmAuditReport {
  vulnerabilities?: Record<string, NpmVulnerability>;
}

export class NpmAuditParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    const auditReport = report as NpmAuditReport;

    if (!auditReport.vulnerabilities) {
      return [];
    }

    const parsed: ParsedVulnerability[] = [];

    for (const [packageName, vuln] of Object.entries(auditReport.vulnerabilities)) {
      // Extract advisory details from via array
      const advisories = this.extractAdvisories(vuln.via);

      for (const advisory of advisories) {
        parsed.push({
          advisoryId: advisory.advisoryId,
          title: advisory.title,
          url: advisory.url,
          severity: this.mapSeverity(vuln.severity),
          cve: advisory.cve,
          dependencyName: packageName,
          versionRange: vuln.range,
          currentVersion: this.extractCurrentVersion(vuln.nodes),
          isFixAvailable: this.isFixAvailable(vuln.fixAvailable),
          fixedVersion: this.extractFixedVersion(vuln.fixAvailable),
        });
      }
    }

    return parsed;
  }

  private extractAdvisories(via: (string | NpmVia)[]): Array<{
    advisoryId: string;
    title: string;
    url?: string;
    cve?: string;
  }> {
    const advisories: Array<{
      advisoryId: string;
      title: string;
      url?: string;
      cve?: string;
    }> = [];

    for (const item of via) {
      if (typeof item === 'object' && item.title) {
        // Extract advisory ID from URL or use source ID
        let advisoryId: string;

        if (item.url) {
          // Try to extract GHSA ID from URL
          const ghsaMatch = item.url.match(/GHSA-[\w-]+/);
          advisoryId = ghsaMatch ? ghsaMatch[0] : `NPM-${item.source || 'UNKNOWN'}`;
        } else {
          advisoryId = `NPM-${item.source || 'UNKNOWN'}`;
        }

        // Try to extract CVE from title or CWE array
        let cve: string | undefined;
        const cveMatch = item.title.match(/CVE-\d{4}-\d+/);
        if (cveMatch) {
          cve = cveMatch[0];
        }

        advisories.push({
          advisoryId,
          title: item.title,
          url: item.url,
          cve,
        });
      }
    }

    // If no advisories found in via, create a generic one
    if (advisories.length === 0) {
      advisories.push({
        advisoryId: 'NPM-UNKNOWN',
        title: 'Unknown vulnerability',
      });
    }

    return advisories;
  }

  private mapSeverity(npmSeverity: string): Severity {
    const severity = npmSeverity.toUpperCase();
    switch (severity) {
      case 'CRITICAL':
        return Severity.CRITICAL;
      case 'HIGH':
        return Severity.HIGH;
      case 'MODERATE':
      case 'MEDIUM':
        return Severity.MEDIUM;
      case 'LOW':
        return Severity.LOW;
      case 'INFO':
        return Severity.INFO;
      default:
        return Severity.MEDIUM;
    }
  }

  private isFixAvailable(fixAvailable: boolean | { name: string; version: string }): boolean {
    return fixAvailable !== false;
  }

  private extractFixedVersion(fixAvailable: boolean | { name: string; version: string }): string | undefined {
    if (typeof fixAvailable === 'object') {
      return fixAvailable.version;
    }
    return undefined;
  }

  private extractCurrentVersion(nodes?: string[]): string | undefined {
    if (nodes && nodes.length > 0) {
      // Extract version from node string like "node_modules/lodash@4.17.20"
      const match = nodes[0].match(/@([\d.]+)$/);
      return match ? match[1] : undefined;
    }
    return undefined;
  }
}
