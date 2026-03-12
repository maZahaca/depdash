import { describe, it, expect } from 'vitest';
import { GoParser } from '@/lib/parsers/go';
import govulncheckFixture from '../fixtures/govulncheck.json';

describe('Go Parser', () => {
  const parser = new GoParser();

  it('should parse govulncheck report', () => {
    const vulnerabilities = parser.parse(govulncheckFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(govulncheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('GO-2023-1234');
    expect(vuln.title).toBeDefined();
    expect(vuln.severity).toBeDefined();
    expect(vuln.dependencyName).toBe('github.com/example/vulnerable');
  });

  it('should extract CVE from aliases', () => {
    const vulnerabilities = parser.parse(govulncheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.cve).toBe('CVE-2023-12345');
  });

  it('should detect fixed version', () => {
    const vulnerabilities = parser.parse(govulncheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.fixedVersion).toBe('v1.2.3');
    expect(vuln.isFixAvailable).toBe(true);
  });

  it('should include advisory URL', () => {
    const vulnerabilities = parser.parse(govulncheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('pkg.go.dev/vuln');
  });

  it('should parse vulnerability summary', () => {
    const vulnerabilities = parser.parse(govulncheckFixture);
    const vuln = vulnerabilities[0];

    // Title comes from OSV summary
    expect(vuln.title).toBe('Denial of service in example package');
  });
});
