import { describe, it, expect } from 'vitest';
import { NuGetParser } from '@/lib/parsers/nuget';
import dotnetFixture from '../fixtures/dotnet-vulnerable.json';

describe('NuGet Parser', () => {
  const parser = new NuGetParser();

  it('should parse dotnet vulnerable report', () => {
    const vulnerabilities = parser.parse(dotnetFixture);

    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(dotnetFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.dependencyName).toBe('Newtonsoft.Json');
    expect(vuln.currentVersion).toBe('12.0.1');
    expect(vuln.severity).toBe('HIGH');
  });

  it('should extract advisory URL', () => {
    const vulnerabilities = parser.parse(dotnetFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.url).toBeDefined();
    expect(vuln.url).toContain('github.com/advisories');
  });

  it('should extract advisory ID from URL', () => {
    const vulnerabilities = parser.parse(dotnetFixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBeDefined();
    expect(vuln.advisoryId).toContain('GHSA-');
  });

  it('should map severity levels', () => {
    const vulnerabilities = parser.parse(dotnetFixture);
    const vuln = vulnerabilities[0];

    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(vuln.severity);
  });
});
