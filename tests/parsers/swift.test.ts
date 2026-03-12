import { describe, it, expect } from 'vitest';
import { SwiftParser } from '@/lib/parsers/swift';
import swiftFixture from '../fixtures/swift-audit.json';

describe('Swift Parser', () => {
  const parser = new SwiftParser();

  it('should parse swift package audit report', () => {
    const vulnerabilities = parser.parse(swiftFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(swiftFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBe('GHSA-xxxx-yyyy-zzzz');
    expect(vuln.title).toBeDefined();
    expect(vuln.dependencyName).toBe('SQLite.swift');
    expect(vuln.currentVersion).toBe('0.13.0');
  });

  it('should map severity correctly', () => {
    const vulnerabilities = parser.parse(swiftFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.severity).toBe('HIGH');
  });

  it('should detect fixed version', () => {
    const vulnerabilities = parser.parse(swiftFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.fixedVersion).toBe('0.14.0');
    expect(vuln.isFixAvailable).toBe(true);
  });

  it('should include advisory URL', () => {
    const vulnerabilities = parser.parse(swiftFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('github.com/advisories');
  });

  it('should have version information', () => {
    const vulnerabilities = parser.parse(swiftFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.versionRange).toBeDefined();
  });
});
