import { describe, it, expect } from 'vitest';
import { PHPParser } from '@/lib/parsers/php';
import composerAuditFixture from '../fixtures/composer-audit.json';

describe('PHP Parser', () => {
  const parser = new PHPParser();

  it('should parse composer audit report', () => {
    const vulnerabilities = parser.parse(composerAuditFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(composerAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('GHSA-abcd-1234-efgh');
    expect(vuln.title).toContain('Session fixation');
    expect(vuln.dependencyName).toBe('symfony/http-kernel');
  });

  it('should extract CVE', () => {
    const vulnerabilities = parser.parse(composerAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.cve).toBe('CVE-2020-15094');
  });

  it('should extract version range', () => {
    const vulnerabilities = parser.parse(composerAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.versionRange).toBeDefined();
    expect(vuln.versionRange).toContain('>=');
  });

  it('should extract fixed version', () => {
    const vulnerabilities = parser.parse(composerAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.fixedVersion).toBeDefined();
    expect(vuln.isFixAvailable).toBe(true);
  });

  it('should include advisory URL', () => {
    const vulnerabilities = parser.parse(composerAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('github.com/advisories');
  });

  it('should estimate severity', () => {
    const vulnerabilities = parser.parse(composerAuditFixture);
    const vuln = vulnerabilities[0];

    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(vuln.severity);
  });
});
