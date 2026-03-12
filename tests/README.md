# DepDash Testing Guide

## Test Structure

```
tests/
├── fixtures/           # Test data for all 10 ecosystems
│   ├── npm-audit.json
│   ├── govulncheck.json
│   ├── pip-audit.json
│   ├── trivy.json
│   ├── dotnet-vulnerable.json
│   ├── swift-audit.json
│   ├── dependency-check.json
│   ├── cargo-audit.json
│   ├── bundle-audit.json
│   └── composer-audit.json
├── parsers/           # Parser integration tests
│   ├── npm.test.ts
│   ├── go.test.ts
│   ├── python.test.ts
│   ├── docker.test.ts
│   ├── nuget.test.ts
│   ├── swift.test.ts
│   ├── android.test.ts
│   ├── rust.test.ts
│   ├── ruby.test.ts
│   └── php.test.ts
└── api/              # API integration tests
    └── audits.test.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test tests/parsers/npm.test.ts

# Run tests matching pattern
npm test -- --grep "NPM"
```

## Parser Tests (60 test cases)

Each parser has comprehensive tests covering:

1. **Basic Parsing** - Verify report format handling
2. **Vulnerability Details** - Extract advisory ID, title, dependency name
3. **Severity Mapping** - Map ecosystem-specific severities to standard levels
4. **Version Information** - Extract current version, version ranges
5. **Fix Detection** - Identify available fixes and fixed versions
6. **CVE Extraction** - Parse CVE identifiers from various formats
7. **URL Handling** - Extract and validate advisory URLs

### Parser Test Coverage

| Parser | Tests | Status |
|--------|-------|--------|
| NPM | 7 | ✅ Passing |
| Go | 6 | ✅ Passing |
| Python | 5 | ✅ Passing |
| Docker | 6 | ✅ Passing |
| NuGet | 5 | ✅ Passing |
| Swift | 6 | ✅ Passing |
| Android | 6 | ✅ Passing |
| Rust | 6 | ✅ Passing |
| Ruby | 6 | ✅ Passing |
| PHP | 7 | ✅ Passing |

## API Integration Tests

API tests are currently **skipped by default** because they require a running Next.js server.

### Running API Tests

1. Start the development server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, run tests:
   ```bash
   npm test tests/api/audits.test.ts
   ```

### API Test Coverage

- ✅ Authentication validation (missing/invalid tokens)
- ✅ NPM audit report ingestion
- ✅ Database persistence verification
- ✅ Auto-resolution logic
- ✅ Ecosystem validation
- ✅ Malformed report handling

## Test Fixtures

All test fixtures are realistic examples based on actual security scanner outputs:

### NPM (`npm-audit.json`)
- Lodash prototype pollution vulnerability
- GHSA advisory format
- Fix availability information

### Go (`govulncheck.json`)
- JSON Lines format with OSV and finding objects
- GO-2023-1234 advisory example
- CVE aliases and patched versions

### Python (`pip-audit.json`)
- Django SQL injection vulnerability
- PYSEC advisory format
- Multiple fix versions

### Docker (`trivy.json`)
- Alpine Linux OpenSSL vulnerability
- Container image scan format
- CVE and CVSS scoring

### NuGet (`dotnet-vulnerable.json`)
- Newtonsoft.Json vulnerability
- GitHub advisory format
- Severity levels (High/Medium/Low)

### Swift (`swift-audit.json`)
- SQLite.swift vulnerability
- GitHub Security Advisory format
- Patched version information

### Android (`dependency-check.json`)
- OkHttp vulnerability
- OWASP Dependency-Check format
- CVSS v3 scoring

### Rust (`cargo-audit.json`)
- Time crate segfault vulnerability
- RUSTSEC advisory database format
- Patched version ranges

### Ruby (`bundle-audit.json`)
- Rails XSS vulnerability
- Bundler-audit format
- Criticality levels and solution text

### PHP (`composer-audit.json`)
- Symfony session fixation vulnerability
- Composer security advisories
- Affected version ranges

## Writing New Tests

### Parser Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { YourParser } from '@/lib/parsers/your-parser';
import fixture from '../fixtures/your-fixture.json';

describe('Your Parser', () => {
  const parser = new YourParser();

  it('should parse report', () => {
    const vulnerabilities = parser.parse(fixture);
    expect(vulnerabilities).toBeDefined();
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should extract vulnerability details', () => {
    const vulnerabilities = parser.parse(fixture);
    const vuln = vulnerabilities[0];

    expect(vuln.advisoryId).toBeDefined();
    expect(vuln.title).toBeDefined();
    expect(vuln.severity).toBeDefined();
    expect(vuln.dependencyName).toBeDefined();
  });

  // Add more specific tests...
});
```

### API Test Template

```typescript
import { describe, it, expect } from 'vitest';

describe('Your API Endpoint', () => {
  it('should handle request', async () => {
    const response = await fetch('http://localhost:3000/api/your-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-token',
      },
      body: JSON.stringify({ /* your data */ }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## Troubleshooting

### Tests Failing After Schema Changes

If you modify the Prisma schema, regenerate the client:

```bash
npx prisma generate
```

### Port Already in Use (API Tests)

If API tests fail with EADDRINUSE:

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Fixture Format Errors

If parser tests fail with format errors, verify your fixture matches the parser's expected format:

```bash
# Test a parser directly
npx tsx -e "
const { YourParser } = require('./lib/parsers/your-parser.ts');
const fixture = require('./tests/fixtures/your-fixture.json');
const parser = new YourParser();
console.log(JSON.stringify(parser.parse(fixture), null, 2));
"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
```

## Coverage Goals

Current coverage:
- ✅ Parser unit tests: 60/60 passing
- ⏭️ API integration tests: 6 tests (require server)
- 🎯 Target: 80%+ code coverage

Run coverage report:

```bash
npm run test:coverage
```

## Next Steps

1. **Increase Coverage**
   - Add tests for notification system
   - Add tests for audit processor logic
   - Add tests for auto-resolution logic

2. **E2E Tests**
   - Full workflow tests (scan → parse → store → resolve)
   - UI component tests with React Testing Library

3. **Performance Tests**
   - Large report parsing benchmarks
   - Database query optimization tests

4. **Mutation Tests**
   - Verify test quality with mutation testing
   - Use tools like Stryker
