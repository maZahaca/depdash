import { Severity } from '@prisma/client';
import type { AuditParser, ParsedVulnerability } from './types';

/**
 * Go parser for govulncheck JSON output
 * Run: govulncheck -json ./...
 *
 * Format: JSON Lines (each line is a JSON object)
 * Types: config, progress, osv, finding
 */

interface GovulncheckOSV {
  schema_version: string;
  id: string;
  modified: string;
  published: string;
  aliases?: string[];
  summary: string;
  details: string;
  affected: Array<{
    package: {
      name: string;
      ecosystem: string;
    };
    ranges?: Array<{
      type: string;
      events: Array<{
        introduced?: string;
        fixed?: string;
      }>;
    }>;
    ecosystem_specific?: {
      imports?: Array<{
        path: string;
      }>;
    };
  }>;
  references?: Array<{
    type: string;
    url: string;
  }>;
  database_specific?: {
    url?: string;
  };
}

interface GovulncheckMessage {
  finding?: {
    osv: string;
    fixed_version: string;
    trace?: Array<{
      module: string;
      version: string;
      package: string;
      function: string;
    }>;
  };
  osv?: GovulncheckOSV;
}

export class GoParser implements AuditParser {
  parse(report: unknown): ParsedVulnerability[] {
    if (typeof report === 'string') {
      report = parseJSONLines(report);
    }

    if (!Array.isArray(report)) {
      throw new Error('Go report must be an array of JSON objects');
    }

    const messages = report as GovulncheckMessage[];
    const osvMap = new Map<string, GovulncheckOSV>();
    const findings = new Map<string, GovulncheckMessage['finding']>();

    // First pass: collect OSV entries and findings
    for (const msg of messages) {
      if (msg.osv) {
        osvMap.set(msg.osv.id, msg.osv);
      }
      if (msg.finding) {
        findings.set(msg.finding.osv, msg.finding);
      }
    }

    const vulnerabilities: ParsedVulnerability[] = [];

    // Second pass: combine findings with OSV data
    for (const [osvId, finding] of findings.entries()) {
      const osv = osvMap.get(osvId);
      if (!osv || !finding) continue;

      // Get the affected package and version from trace
      const trace = finding.trace?.[0];
      if (!trace) continue;

      const packageName = trace.module || trace.package;
      const currentVersion = trace.version;

      // Extract CVE from aliases
      const cve = osv.aliases?.find((alias) => alias.startsWith('CVE-'));

      // Get reference URL
      const refUrl = osv.database_specific?.url ||
                     osv.references?.[0]?.url ||
                     `https://pkg.go.dev/vuln/${osv.id}`;

      // Determine severity from CVSS or use MEDIUM as default
      // govulncheck doesn't include severity, so we default to MEDIUM
      // In production, you might want to fetch CVSS scores from NVD
      const severity = Severity.MEDIUM;

      // Build version range string
      const versionRange = buildVersionRange(osv, packageName);

      vulnerabilities.push({
        advisoryId: osv.id,
        title: osv.summary || osv.details.split('\n')[0],
        severity,
        dependencyName: packageName,
        versionRange,
        currentVersion: currentVersion || 'unknown',
        isFixAvailable: !!finding.fixed_version,
        fixedVersion: finding.fixed_version || undefined,
        cve: cve || undefined,
        url: refUrl,
      });
    }

    return vulnerabilities;
  }
}

function parseJSONLines(input: string): unknown[] {
  const lines = input.trim().split('\n');
  const result: unknown[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      result.push(JSON.parse(line));
    } catch (error) {
      console.warn('Failed to parse JSON line:', line);
    }
  }

  return result;
}

function buildVersionRange(osv: GovulncheckOSV, packageName: string): string {
  const affected = osv.affected.find((a) => a.package.name === packageName);
  if (!affected?.ranges || affected.ranges.length === 0) {
    return '*';
  }

  const range = affected.ranges[0];
  const events = range.events;

  let introduced = '0';
  let fixed = '';

  for (const event of events) {
    if (event.introduced) introduced = event.introduced;
    if (event.fixed) fixed = event.fixed;
  }

  if (fixed) {
    return `<${fixed}`;
  } else if (introduced !== '0') {
    return `>=${introduced}`;
  }

  return '*';
}
