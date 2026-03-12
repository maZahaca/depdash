import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * NuGet parser for dotnet list package --vulnerable --format json
 * Run: dotnet list package --vulnerable --format json
 *
 * Format: JSON with projects array containing frameworks and vulnerable packages
 */

interface NuGetVulnerability {
  severity: string; // Low | Moderate | High | Critical
  advisoryurl: string;
}

interface NuGetPackage {
  id: string;
  requestedVersion: string;
  resolvedVersion: string;
  latestVersion?: string;
  vulnerabilities?: NuGetVulnerability[];
}

interface NuGetFramework {
  framework: string;
  topLevelPackages?: NuGetPackage[];
  transitivePackages?: NuGetPackage[];
}

interface NuGetProject {
  path: string;
  frameworks: NuGetFramework[];
}

interface NuGetReport {
  version: number;
  parameters: string;
  projects: NuGetProject[];
}

export class NuGetParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = JSON.parse(report);
    }

    const nugetReport = report as NuGetReport;

    if (!nugetReport.projects || !Array.isArray(nugetReport.projects)) {
      throw new Error('Invalid NuGet report format');
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const project of nugetReport.projects) {
      if (!project.frameworks) continue;

      for (const framework of project.frameworks) {
        // Process top-level packages
        if (framework.topLevelPackages) {
          this.processPackages(framework.topLevelPackages, vulnerabilities);
        }

        // Process transitive packages
        if (framework.transitivePackages) {
          this.processPackages(framework.transitivePackages, vulnerabilities);
        }
      }
    }

    return vulnerabilities;
  }

  private processPackages(packages: NuGetPackage[], vulnerabilities: ParsedVulnerability[]) {
    for (const pkg of packages) {
      if (!pkg.vulnerabilities || pkg.vulnerabilities.length === 0) continue;

      for (const vuln of pkg.vulnerabilities) {
        // Extract advisory ID from URL
        const advisoryId = this.extractAdvisoryId(vuln.advisoryurl);

        // Map severity
        const severity = this.mapSeverity(vuln.severity);

        // Build title from package and severity
        const title = `${pkg.id} has ${vuln.severity} severity vulnerability`;

        // Determine if fix is available
        const isFixAvailable = !!pkg.latestVersion && pkg.latestVersion !== pkg.resolvedVersion;

        vulnerabilities.push({
          advisoryId,
          title,
          severity,
          dependencyName: pkg.id,
          versionRange: `<=${pkg.resolvedVersion}`,
          currentVersion: pkg.resolvedVersion,
          isFixAvailable,
          fixedVersion: pkg.latestVersion || undefined,
          cve: this.extractCVE(vuln.advisoryurl),
          url: vuln.advisoryurl,
        });
      }
    }
  }

  private extractAdvisoryId(url: string): string {
    // Try to extract GHSA or CVE from URL
    const ghsaMatch = url.match(/GHSA-[\w-]+/);
    if (ghsaMatch) return ghsaMatch[0];

    const cveMatch = url.match(/CVE-\d{4}-\d+/);
    if (cveMatch) return cveMatch[0];

    // Try to extract ID from GitHub advisory URL
    const githubMatch = url.match(/advisories\/([A-Z]+-[\w-]+)/);
    if (githubMatch) return githubMatch[1];

    // Fallback to using URL hash
    return `NUGET-${this.hashCode(url)}`;
  }

  private extractCVE(url: string): string | undefined {
    const cveMatch = url.match(/CVE-\d{4}-\d+/);
    return cveMatch ? cveMatch[0] : undefined;
  }

  private mapSeverity(nugetSeverity: string): Severity {
    const severity = nugetSeverity.toLowerCase();

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

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase();
  }
}
