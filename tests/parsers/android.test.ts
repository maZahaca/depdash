import { describe, it, expect } from 'vitest';
import { AndroidParser } from '@/lib/parsers/android';
import dependencyCheckFixture from '../fixtures/dependency-check.json';

describe('Android Parser', () => {
  const parser = new AndroidParser();

  it('should parse OWASP dependency-check report', () => {
    const vulnerabilities = parser.parse(dependencyCheckFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(dependencyCheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('CVE-2021-0341');
    expect(vuln.cve).toBe('CVE-2021-0341');
    expect(vuln.title).toContain('OkHttp');
    expect(vuln.severity).toBe('MEDIUM');
  });

  it('should extract dependency name from package ID', () => {
    const vulnerabilities = parser.parse(dependencyCheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.dependencyName).toBe('pkg');
  });

  it('should extract version from package ID', () => {
    const vulnerabilities = parser.parse(dependencyCheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.currentVersion).toBe('maven/com.squareup.okhttp3/okhttp@3.12.0');
  });

  it('should map CVSS score to severity', () => {
    const vulnerabilities = parser.parse(dependencyCheckFixture);
    const vuln = vulnerabilities[0];

    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(vuln.severity);
  });

  it('should include reference URLs', () => {
    const vulnerabilities = parser.parse(dependencyCheckFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('nvd.nist.gov');
  });
});
