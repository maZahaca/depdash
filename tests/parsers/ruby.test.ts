import { describe, it, expect } from 'vitest';
import { RubyParser } from '@/lib/parsers/ruby';
import bundleAuditFixture from '../fixtures/bundle-audit.json';

describe('Ruby Parser', () => {
  const parser = new RubyParser();

  it('should parse bundle audit report', () => {
    const vulnerabilities = parser.parse(bundleAuditFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(bundleAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('CVE-2023-12345');
    expect(vuln.title).toContain('XSS');
    expect(vuln.dependencyName).toBe('rails');
    expect(vuln.currentVersion).toBe('5.2.3');
  });

  it('should extract CVE', () => {
    const vulnerabilities = parser.parse(bundleAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.cve).toBe('CVE-2023-12345');
  });

  it('should map criticality to severity', () => {
    const vulnerabilities = parser.parse(bundleAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.severity).toBe('MEDIUM');
  });

  it('should extract fixed version from solution', () => {
    const vulnerabilities = parser.parse(bundleAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.fixedVersion).toBeDefined();
    expect(vuln.isFixAvailable).toBe(true);
  });

  it('should include advisory URL', () => {
    const vulnerabilities = parser.parse(bundleAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('github.com/advisories');
  });
});
