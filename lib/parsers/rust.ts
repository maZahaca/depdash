import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * Rust parser for cargo audit JSON output
 * Run: cargo audit --json
 *
 * Format: JSON with vulnerabilities object containing advisories
 */

interface RustAdvisory {
  id: string; // RUSTSEC-2023-0001
  package: string;
  title: string;
  description: string;
  date: string;
  aliases?: string[]; // CVE aliases
  references?: string[];
  cvss?: string;
  keywords?: string[];
  url: string;
}

interface RustVersion {
  patched: string[];
  unaffected: string[];
}

interface RustVulnerability {
  advisory: RustAdvisory;
  versions: RustVersion;
  package: {
    name: string;
    version: string;
    source?: string;
  };
}

interface RustAuditReport {
  vulnerabilities: {
    list: RustVulnerability[];
    count: number;
  };
}

export class RustParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const rustReport = report as RustAuditReport;

    if (!rustReport.vulnerabilities?.list || !Array.isArray(rustReport.vulnerabilities.list)) {
      return [];
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const vuln of rustReport.vulnerabilities.list) {
      // Extract CVE from aliases
      const cve = vuln.advisory.aliases?.find((alias) => alias.startsWith('CVE-'));

      // Determine severity from CVSS or keywords
      const severity = this.determineSeverity(vuln.advisory);

      // Get first patched version
      const fixedVersion = vuln.versions.patched?.[0] || undefined;

      // Build version range
      const versionRange = fixedVersion
        ? `<${fixedVersion}`
        : `=${vuln.package.version}`;

      vulnerabilities.push({
        advisoryId: vuln.advisory.id,
        title: vuln.advisory.title,
        severity,
        dependencyName: vuln.package.name,
        versionRange,
        currentVersion: vuln.package.version,
        isFixAvailable: !!fixedVersion,
        fixedVersion,
        cve: cve || undefined,
        url: vuln.advisory.url || `https://rustsec.org/advisories/${vuln.advisory.id}`,
      });
    }

    return vulnerabilities;
  }

  private determineSeverity(advisory: RustAdvisory): Severity {
    // Check CVSS score if available
    if (advisory.cvss) {
      const cvssMatch = advisory.cvss.match(/CVSS:3\.\d\/AV:[A-Z]\/AC:[A-Z]\/PR:[A-Z]\/UI:[A-Z]\/S:[A-Z]\/C:[A-Z]\/I:[A-Z]\/A:[A-Z]/);
      if (cvssMatch) {
        // Parse CVSS v3 base score (simplified)
        const score = this.estimateCVSSScore(advisory.cvss);
        if (score >= 9.0) return Severity.CRITICAL;
        if (score >= 7.0) return Severity.HIGH;
        if (score >= 4.0) return Severity.MEDIUM;
        if (score > 0) return Severity.LOW;
      }
    }

    // Check keywords for severity indicators
    const keywords = advisory.keywords || [];
    const description = advisory.description.toLowerCase();
    const title = advisory.title.toLowerCase();

    if (
      keywords.some(k => k.toLowerCase() === 'critical') ||
      description.includes('remote code execution') ||
      description.includes('arbitrary code') ||
      title.includes('critical')
    ) {
      return Severity.CRITICAL;
    }

    if (
      keywords.some(k => k.toLowerCase() === 'high') ||
      description.includes('memory corruption') ||
      description.includes('use after free') ||
      title.includes('high')
    ) {
      return Severity.HIGH;
    }

    if (keywords.some(k => k.toLowerCase() === 'low')) {
      return Severity.LOW;
    }

    // Default to MEDIUM
    return Severity.MEDIUM;
  }

  private estimateCVSSScore(cvss: string): number {
    // Very simplified CVSS score estimation
    // In production, use a proper CVSS calculator
    const criticalIndicators = ['AV:N', 'AC:L', 'PR:N', 'C:H', 'I:H', 'A:H'];
    const matches = criticalIndicators.filter(indicator => cvss.includes(indicator));

    if (matches.length >= 5) return 9.5;
    if (matches.length >= 4) return 7.5;
    if (matches.length >= 2) return 5.0;
    return 3.0;
  }
}
