import { describe, it, expect } from 'vitest';
import { RustParser } from '@/lib/parsers/rust';
import cargoAuditFixture from '../fixtures/cargo-audit.json';

describe('Rust Parser', () => {
  const parser = new RustParser();

  it('should parse cargo audit report', () => {
    const vulnerabilities = parser.parse(cargoAuditFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(cargoAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('RUSTSEC-2023-0001');
    expect(vuln.title).toContain('segfault');
    expect(vuln.dependencyName).toBe('time');
    expect(vuln.currentVersion).toBe('0.3.16');
  });

  it('should extract CVE from aliases', () => {
    const vulnerabilities = parser.parse(cargoAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.cve).toBe('CVE-2023-12345');
  });

  it('should detect fixed version from patched versions', () => {
    const vulnerabilities = parser.parse(cargoAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.fixedVersion).toBeDefined();
    expect(vuln.isFixAvailable).toBe(true);
  });

  it('should include advisory URL', () => {
    const vulnerabilities = parser.parse(cargoAuditFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('rustsec.org');
  });

  it('should estimate severity from CVSS', () => {
    const vulnerabilities = parser.parse(cargoAuditFixture);
    const vuln = vulnerabilities[0];

    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(vuln.severity);
  });
});
