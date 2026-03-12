import { describe, it, expect } from 'vitest';
import { DockerParser } from '@/lib/parsers/docker';
import trivyFixture from '../fixtures/trivy.json';

describe('Docker Parser', () => {
  const parser = new DockerParser();

  it('should parse Trivy report', () => {
    const vulnerabilities = parser.parse(trivyFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(trivyFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('CVE-2023-1234');
    expect(vuln.title).toBeDefined();
    expect(vuln.dependencyName).toBe('libcrypto3');
    expect(vuln.currentVersion).toBe('3.0.7-r0');
  });

  it('should map severity correctly', () => {
    const vulnerabilities = parser.parse(trivyFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.severity).toBe('HIGH');
  });

  it('should detect fixed version', () => {
    const vulnerabilities = parser.parse(trivyFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.fixedVersion).toBe('3.0.8-r0');
    expect(vuln.isFixAvailable).toBe(true);
  });

  it('should include CVE as advisory ID', () => {
    const vulnerabilities = parser.parse(trivyFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.cve).toBe('CVE-2023-1234');
  });

  it('should include advisory URL', () => {
    const vulnerabilities = parser.parse(trivyFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('avd.aquasec.com');
  });
});
