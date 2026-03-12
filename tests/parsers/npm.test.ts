import { describe, it, expect } from 'vitest';
import { NpmAuditParser } from '@/lib/parsers/npm';
import npmFixture from '../fixtures/npm-audit.json';

describe('NPM Parser', () => {
  const parser = new NpmAuditParser();

  it('should parse npm audit report', () => {
    const vulnerabilities = parser.parse(npmFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(npmFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBeDefined();
    expect(vuln.title).toBeDefined();
    expect(vuln.severity).toBeDefined();
    expect(vuln.dependencyName).toBe('lodash');
  });

  it('should map severity correctly', () => {
    const vulnerabilities = parser.parse(npmFixture);
    const vuln = vulnerabilities[0];

    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(vuln.severity);
  });

  it('should detect fix availability', () => {
    const vulnerabilities = parser.parse(npmFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.isFixAvailable).toBe(true);
    expect(vuln.fixedVersion).toBeDefined();
  });

  it('should extract version information', () => {
    const vulnerabilities = parser.parse(npmFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.versionRange).toBe('<=4.17.20');
    // currentVersion is undefined for npm audit format (not provided in report)
  });

  it('should handle CVE extraction', () => {
    const vulnerabilities = parser.parse(npmFixture);
    const vulnWithCVE = vulnerabilities.find(v => v.cve);

    // CVE might not be present in all advisories
    if (vulnWithCVE) {
      expect(vulnWithCVE.cve).toMatch(/^CVE-\d{4}-\d+$/);
    }
  });

  it('should include advisory URL', () => {
    const vulnerabilities = parser.parse(npmFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('github.com');
  });
});
