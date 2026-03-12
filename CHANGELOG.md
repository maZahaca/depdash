# Changelog

All notable changes to DepDash will be documented in this file.

## [1.0.0] - 2026-03-12

### 🎉 Initial Release - Production Ready

DepDash 1.0.0 is a complete, production-ready dependency vulnerability management platform supporting 10 programming ecosystems.

### Added

#### Core Platform
- Multi-tenant dependency vulnerability dashboard
- Support for 10 ecosystems: NPM, Go, Python, Docker, C#/.NET, Swift, Android, Rust, Ruby, PHP
- PostgreSQL database with Prisma ORM
- NextAuth.js v5 authentication with password and OAuth support
- RESTful API with 14 endpoints
- API token authentication with SHA-256 hashing

#### Vulnerability Management
- Auto-resolution when vulnerabilities disappear from scans
- Manual status management (Open, Resolved, False Positive, Accepted Risk, Won't Fix, Postponed)
- Bulk operations for managing multiple vulnerabilities
- Configurable fix timelines by severity (Critical: 7d, High: 30d, Medium: 90d, Low: 180d)
- Version range and fix version tracking
- CVE and advisory URL linking

#### Dashboard UI
- Vulnerability list with advanced filtering (severity, status, repository, ecosystem)
- URL-based filter persistence for shareable links
- Bulk selection with checkboxes
- Vulnerability detail page with complete audit trail
- Repository list grouped by organization
- Project-level stats with last scan timestamps
- Settings page for fix timeline configuration

#### Analytics
- Analytics dashboard with 8+ charts using Recharts
- Vulnerability trends over time (line chart)
- Resolution statistics breakdown
- Severity and status distribution (pie/bar charts)
- Top repositories by vulnerability count
- Resolution time metrics (avg, median, min, max)
- Ecosystem breakdown
- Configurable time ranges (7/30/90/365 days)

#### Integrations
- API token generation and management UI
- Slack webhook notifications for new vulnerabilities
- Real-time alerts with severity breakdown
- Test notification functionality
- GitHub Actions workflow examples
- GitLab CI integration examples

#### Parsers (10 Total)
1. **NPM** - npm audit --json format
   - GHSA advisory support
   - Fix version detection
   - CVSS scoring

2. **Go** - govulncheck -json format
   - JSON Lines format parsing
   - OSV vulnerability database
   - Affected version ranges
   - CVE extraction from aliases

3. **Python** - pip-audit --format json
   - PYSEC and GHSA advisory support
   - Multiple fix versions
   - Severity inference from description

4. **Docker** - Trivy --format json
   - Container image scanning
   - OS package vulnerabilities
   - CVSS v2/v3 scoring
   - Multiple severity levels

5. **C#/NuGet** - dotnet list package --vulnerable --format json
   - Top-level and transitive packages
   - GitHub advisory extraction
   - Version comparison logic

6. **Swift** - swift package audit --format json
   - Swift 5.9+ experimental feature
   - GHSA and OSV support
   - Patched version detection

7. **Android** - OWASP Dependency-Check
   - Gradle plugin support
   - JAR/AAR file analysis
   - CVE and NVD linking
   - CVSS score mapping

8. **Rust** - cargo audit --json
   - RUSTSEC advisory database
   - CVSS vector parsing
   - Patched version ranges
   - CVE aliases

9. **Ruby** - bundle audit --format json
   - Bundler-audit format
   - Criticality level mapping
   - Solution text parsing for fixes
   - CVE and GHSA support

10. **PHP** - composer audit --format=json
    - Composer security advisories
    - Affected version range parsing
    - Multiple security sources
    - Fix version extraction

#### Testing
- Vitest test framework setup
- 60+ parser integration tests
- Test fixtures for all 10 ecosystems
- API integration test suite
- Test documentation (tests/README.md)
- 100% parser test coverage

#### Documentation
- Comprehensive README with setup instructions
- Integration Guide (docs/INTEGRATION_GUIDE.md)
  - GitHub Actions workflows for all ecosystems
  - GitLab CI examples
  - Mono-repo support patterns
  - API reference
  - Troubleshooting guide
- Quick Start Guide (docs/QUICKSTART.md)
  - 5-minute setup
  - First scan examples
  - Common issues
- Implementation Tracker (IMPLEMENTATION.md)
- Project Status (PROJECT_STATUS.md)
- Test Documentation (tests/README.md)

#### Database Schema
- 14 models with complete relationships
- Multi-tenancy enforcement
- Audit trail for all status changes
- Scan history tracking
- API token management
- Organization settings

### Security
- bcrypt password hashing
- SHA-256 API token hashing
- Organization-level isolation
- Input validation with Zod schemas
- SQL injection prevention (Prisma)
- XSS prevention (React Server Components)
- Secure session management (NextAuth.js)

### Performance
- Database indexing on all critical queries
- Server Components for efficient data fetching
- Minimal client-side JavaScript
- Optimized vulnerability queries with filtering
- Analytics data aggregation
- Efficient bulk operations

### Developer Experience
- TypeScript throughout
- Prisma type-safe queries
- shadcn/ui component library
- Hot module replacement
- Database seeding script
- Comprehensive error handling

## Roadmap

### v1.1.0 (Planned)
- Organization switcher UI
- Scan history view
- CSV export functionality
- Email notifications

### v1.2.0 (Planned)
- Additional parsers (Grype, Elixir, Scala, Kotlin)
- Data retention cleanup cron job
- Expired postponement checks
- Enhanced analytics

### v2.0.0 (Future)
- SBOM support (CycloneDX, SPDX)
- GitHub App integration
- Jira integration
- Compliance reports (PCI-DSS, SOC 2)
- SSO support (SAML, OIDC)
- GraphQL API
- Webhooks

## Migration Guide

This is the initial release. No migration needed.

## Contributors

Andrew Red

## License

See LICENSE file for details.
