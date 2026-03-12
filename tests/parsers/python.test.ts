import { describe, it, expect } from 'vitest';
import { PythonParser } from '@/lib/parsers/python';
import pipAuditFixture from '../fixtures/pip-audit.json';

describe('Python Parser', () => {
  const parser = new PythonParser();

  it('should parse pip-audit report', () => {
    const vulnerabilities = parser.parse(pipAuditFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(pipAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('PYSEC-2023-45');
    expect(vuln.title).toContain('Django');
    expect(vuln.dependencyName).toBe('django');
    expect(vuln.currentVersion).toBe('3.2.0');
  });

  it('should extract CVE from aliases', () => {
    const vulnerabilities = parser.parse(pipAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.cve).toBe('CVE-2023-23969');
  });

  it('should detect fix availability', () => {
    const vulnerabilities = parser.parse(pipAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.isFixAvailable).toBe(true);
    expect(vuln.fixedVersion).toBeDefined();
  });

  it('should map severity correctly', () => {
    const vulnerabilities = parser.parse(pipAuditFixture);
    const vuln = vulnerabilities[0];

    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(vuln.severity);
  });
});
