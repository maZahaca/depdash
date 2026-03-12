# DepDash - Dependency Vulnerability Dashboard

![Tests](https://github.com/mazahaca/depdash/workflows/Tests/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Tests:** 60/60 Passing

Company-level dashboard for tracking dependency vulnerabilities across **10 programming ecosystems** with comprehensive CI/CD integration.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker (optional, for local database)

### Installation

```bash
# Install dependencies
npm install

# Start PostgreSQL (via Docker)
docker-compose up -d

# Setup database
npm run db:push

# Seed with test data
npm run db:seed

# Start development server
npm run dev
```

Visit http://localhost:3000

### Test Credentials

After seeding, use these credentials:

- **Email**: admin@depdash.dev
- **Password**: password
- **Organization**: Acme Corporation (slug: acme)
- **API Token**: Check console output from `npm run db:seed`

### Running Tests

```bash
# Run all parser tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

See [tests/README.md](tests/README.md) for comprehensive testing documentation.

## Features

- ✅ **10 Ecosystems Supported**: NPM, Go, Python, Docker, C#/.NET, Swift, Android/Java, Rust, Ruby, PHP
- ✅ Multi-repository and mono-repository support
- ✅ Code dependencies AND Docker image vulnerability tracking
- ✅ Project-level vulnerability tracking with path support
- ✅ Auto-resolution when vulnerabilities disappear from scans
- ✅ Manual status management (False Positive, Accept Risk, Won't Fix, Postpone)
- ✅ Bulk actions for managing multiple vulnerabilities
- ✅ Analytics dashboard with trends and charts
- ✅ Slack notifications for new vulnerabilities
- ✅ API token management with secure SHA-256 hashing
- ✅ Configurable fix timelines by severity
- ✅ Multi-tenancy with strict organization isolation

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Server Components
- **Backend**: Next.js Route Handlers, Server Actions
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod

## API Endpoints

### Audit Ingestion

```bash
POST /api/v1/audits
Authorization: Bearer <api-token>

{
  "organizationId": "...",
  "repository": "owner/repo-name",
  "path": ".",
  "ecosystem": "NPM",
  "report": { /* npm audit --json output */ },
  "scanSource": "github-actions",
  "scanJobUrl": "https://github.com/...",
  "commitSha": "abc123",
  "branch": "main"
}
```

### List Vulnerabilities

```bash
GET /api/v1/vulnerabilities?organizationId=...&severity=CRITICAL&status=OPEN
```

### Update Vulnerability Status

```bash
PATCH /api/v1/vulnerabilities/:id

{
  "status": "POSTPONED",
  "note": "Waiting for major release",
  "postponedUntil": "2026-06-01T00:00:00Z"
}
```

## Project Structure

```
depdash/
├── app/                    # Next.js app directory
│   ├── api/v1/            # API routes
│   ├── (auth)/            # Auth pages
│   └── (dashboard)/       # Dashboard pages
├── lib/                   # Business logic
│   ├── audit/            # Audit processing
│   ├── parsers/          # Ecosystem parsers
│   └── api/              # API utilities
├── prisma/               # Database schema & migrations
└── components/           # React components
```

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database commands
npm run db:push      # Push schema changes
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed test data

# Linting
npm run lint
```

## Documentation

- **[Quick Start Guide](./docs/QUICKSTART.md)** - Get running in 5 minutes
- **[Integration Guide](./docs/INTEGRATION_GUIDE.md)** - CI/CD integration with examples

## Supported Scanners

| Ecosystem | Scanner | Command |
|-----------|---------|---------|
| NPM (JavaScript/Node.js) | npm audit | `npm audit --json` |
| Go | govulncheck | `govulncheck -json ./...` |
| Python | pip-audit | `pip-audit --format json` |
| Docker | Trivy | `trivy image --format json <image>` |
| C#/.NET | dotnet CLI | `dotnet list package --vulnerable --format json` |
| Swift | swift package | `swift package audit --format json` |
| Android/Java | OWASP Dependency-Check | `./gradlew dependencyCheckAnalyze --format JSON` |
| Rust | cargo audit | `cargo audit --json` |
| Ruby | bundler-audit | `bundle audit --format json` |
| PHP | composer audit | `composer audit --format=json` |

See the [Integration Guide](./docs/INTEGRATION_GUIDE.md) for complete CI/CD examples.

## License

MIT
