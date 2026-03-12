import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * Android parser for Gradle dependency-check-gradle plugin
 * Run: ./gradlew dependencyCheckAnalyze --format JSON
 *
 * Uses OWASP Dependency-Check plugin for Gradle
 * Add to build.gradle:
 * plugins {
 *   id 'org.owasp.dependencycheck' version '8.4.0'
 * }
 *
 * Format: JSON with dependencies array containing vulnerabilities
 */

interface AndroidVulnerability {
  name: string; // CVE-2023-12345
  cvssv3?: {
    baseScore: number;
    baseSeverity: string;
  };
  cvssv2?: {
    score: number;
    severity: string;
  };
  description: string;
  references?: Array<{
    source: string;
    url: string;
    name: string;
  }>;
}

interface AndroidDependency {
  fileName: string;
  filePath: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
  description?: string;
  license?: string;
  packages?: Array<{
    id: string;
    confidence: string;
    url?: string;
  }>;
  vulnerabilities?: AndroidVulnerability[];
}

interface AndroidReport {
  reportSchema: string;
  scanInfo: {
    engineVersion: string;
  };
  projectInfo?: {
    name: string;
  };
  dependencies: AndroidDependency[];
}

export class AndroidParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const androidReport = report as AndroidReport;

    if (!androidReport.dependencies || !Array.isArray(androidReport.dependencies)) {
      throw new Error('Invalid Android dependency-check report format');
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const dep of androidReport.dependencies) {
      if (!dep.vulnerabilities || dep.vulnerabilities.length === 0) continue;

      // Extract package info
      const packageInfo = this.extractPackageInfo(dep);

      for (const vuln of dep.vulnerabilities) {
        // Map severity from CVSS score
        const severity = this.mapSeverityFromCVSS(vuln);

        // Get primary reference URL
        const url = this.getPrimaryUrl(vuln);

        // Extract title from description
        const title = this.extractTitle(vuln.description);

        vulnerabilities.push({
          advisoryId: vuln.name,
          title,
          severity,
          dependencyName: packageInfo.name,
          versionRange: '*', // Dependency-check doesn't provide version range
          currentVersion: packageInfo.version,
          isFixAvailable: false, // Dependency-check doesn't provide fix info
          fixedVersion: undefined,
          cve: vuln.name.startsWith('CVE-') ? vuln.name : undefined,
          url,
        });
      }
    }

    return vulnerabilities;
  }

  private extractPackageInfo(dep: AndroidDependency): { name: string; version: string } {
    // Try to extract from packages array
    if (dep.packages && dep.packages.length > 0) {
      const pkg = dep.packages[0];
      const parts = pkg.id.split(':');

      if (parts.length >= 3) {
        // Format: group:artifact:version
        return {
          name: `${parts[0]}:${parts[1]}`,
          version: parts[2],
        };
      } else if (parts.length === 2) {
        return {
          name: parts[0],
          version: parts[1],
        };
      }
    }

    // Fallback to fileName
    const fileName = dep.fileName.replace(/\.(jar|aar)$/, '');
    const versionMatch = fileName.match(/-(\d+[\d.]*\d+)$/);

    if (versionMatch) {
      return {
        name: fileName.substring(0, fileName.lastIndexOf('-')),
        version: versionMatch[1],
      };
    }

    return {
      name: fileName,
      version: 'unknown',
    };
  }

  private mapSeverityFromCVSS(vuln: AndroidVulnerability): Severity {
    // Prefer CVSSv3 over CVSSv2
    const cvss = vuln.cvssv3 || vuln.cvssv2;

    if (!cvss) {
      return Severity.MEDIUM;
    }

    const score = 'baseScore' in cvss ? cvss.baseScore : cvss.score;

    if (score >= 9.0) {
      return Severity.CRITICAL;
    } else if (score >= 7.0) {
      return Severity.HIGH;
    } else if (score >= 4.0) {
      return Severity.MEDIUM;
    } else if (score > 0) {
      return Severity.LOW;
    }

    return Severity.INFO;
  }

  private getPrimaryUrl(vuln: AndroidVulnerability): string {
    // Prefer NVD URL for CVEs
    if (vuln.name.startsWith('CVE-')) {
      const year = vuln.name.split('-')[1];
      const id = vuln.name.split('-')[2];
      return `https://nvd.nist.gov/vuln/detail/CVE-${year}-${id}`;
    }

    // Try to get URL from references
    if (vuln.references && vuln.references.length > 0) {
      const nvdRef = vuln.references.find(ref => ref.source === 'NVD');
      if (nvdRef?.url) return nvdRef.url;

      const ghsaRef = vuln.references.find(ref => ref.name?.startsWith('GHSA-'));
      if (ghsaRef?.url) return ghsaRef.url;

      // Return first reference with URL
      const firstUrlRef = vuln.references.find(ref => ref.url);
      if (firstUrlRef?.url) return firstUrlRef.url;
    }

    return `https://osv.dev/vulnerability/${vuln.name}`;
  }

  private extractTitle(description: string): string {
    // Take first sentence or first 100 characters
    const firstSentence = description.split(/[.!?]/)[0];
    return firstSentence.length > 100
      ? firstSentence.substring(0, 100) + '...'
      : firstSentence;
  }
}
