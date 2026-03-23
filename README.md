# DepDash - Dependency Vulnerability Dashboard

![Tests](https://github.com/mazahaca/depdash/workflows/Tests/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Tests:** 60/60 Passing

Company-level dashboard for tracking dependency vulnerabilities across **10 programming ecosystems** with comprehensive CI/CD integration.

## Quick Start

### Prerequisites

- Node.js 24+
- PostgreSQL 18+
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
- **Role**: OWNER (full access)
- **API Token**: Check console output from `npm run db:seed`

### Docker Deployment

```bash
# Build Docker image
docker build -t depdash .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/depdash" \
  -e NEXTAUTH_SECRET="your-secret-key" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e AUTH_TRUST_HOST="true" \
  depdash
```

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

### Core Functionality
- ✅ **10 Ecosystems Supported**: NPM, Go, Python, Docker, C#/.NET, Swift, Android/Java, Rust, Ruby, PHP
- ✅ Multi-repository and mono-repository support
- ✅ Code dependencies AND Docker image vulnerability tracking
- ✅ Project-level vulnerability tracking with path support
- ✅ Auto-resolution when vulnerabilities disappear from scans
- ✅ Manual status management (False Positive, Accept Risk, Won't Fix, Postpone)
- ✅ Bulk actions for managing multiple vulnerabilities

### User Management
- ✅ Role-based access control (OWNER, ADMIN, MEMBER, VIEWER)
- ✅ User invitation and management
- ✅ Multiple authentication providers (Email/Password, Google, GitHub, GitLab)
- ✅ Organization-level user isolation

### Integrations & Notifications
- ✅ Slack notifications for new vulnerabilities
- ✅ API token management with secure SHA-256 hashing
- ✅ CI/CD integration support
- ✅ Configurable fix timelines by severity

### Dashboard & Analytics
- ✅ Analytics dashboard with trends and charts
- ✅ Vulnerability filtering and search
- ✅ Scan history tracking
- ✅ Multi-tenancy with strict organization isolation

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Server Components
- **Backend**: Next.js Route Handlers, Server Actions
- **Database**: PostgreSQL 18 + Prisma ORM v7 (with adapter pattern)
- **Auth**: NextAuth.js v5 (Auth.js)
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Runtime**: Node.js 24+
- **Deployment**: Docker (multi-stage build with Alpine Linux)

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

### User Management

```bash
# Create user (OWNER/ADMIN only)
POST /api/v1/users
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "secure-password",
  "role": "MEMBER",
  "organizationId": "..."
}

# Remove user from organization
DELETE /api/v1/users/:memberId
```

### API Tokens

```bash
# Create API token
POST /api/v1/tokens
{
  "name": "CI/CD Token",
  "organizationId": "..."
}

# List API tokens
GET /api/v1/tokens?organizationId=...

# Delete API token
DELETE /api/v1/tokens/:id
```

### Vulnerabilities

```bash
# List vulnerabilities
GET /api/v1/vulnerabilities?organizationId=...&severity=CRITICAL&status=OPEN

# Update vulnerability status
PATCH /api/v1/vulnerabilities/:id
{
  "status": "POSTPONED",
  "note": "Waiting for major release",
  "postponedUntil": "2026-06-01T00:00:00Z"
}
```

### Scans

```bash
# List scans
GET /api/v1/scans?organizationId=...&repositoryId=...
```

### Health Check

```bash
# Health check endpoint
GET /api/health
```

## Project Structure

```
depdash/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── v1/           # V1 API endpoints
│   │   └── health/       # Health check
│   ├── (auth)/           # Auth pages (login)
│   └── (dashboard)/      # Dashboard pages
│       └── dashboard/    # Protected routes
│           ├── vulnerabilities/
│           ├── repositories/
│           ├── scans/
│           ├── analytics/
│           ├── integrations/
│           ├── settings/
│           └── users/
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── users/            # User management
│   ├── settings/         # Settings forms
│   ├── integrations/     # Integration components
│   └── scans/            # Scan components
├── lib/                  # Business logic
│   ├── audit/           # Audit processing
│   ├── parsers/         # Ecosystem parsers
│   └── api/             # API utilities
├── prisma/              # Database schema
│   ├── schema.prisma    # Prisma schema (snake_case tables)
│   └── seed.ts          # Database seeding
├── tests/               # Test suites
│   ├── api/            # API integration tests
│   └── parsers/        # Parser unit tests
├── public/             # Static assets
│   └── DepDash.svg     # Logo
├── Dockerfile          # Production Docker build
├── docker-compose.yml  # Local PostgreSQL setup
└── middleware.ts       # Auth middleware
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

# Testing
npm test             # Run all tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run with coverage

# Linting
npm run lint
```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/depdash"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"  # Required for production

# OAuth (Optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GITLAB_CLIENT_ID="..."
GITLAB_CLIENT_SECRET="..."
GITLAB_URL="..."  # Optional: For self-hosted GitLab

# Retention (Optional)
RETAIN_SCANS_FOR_DAYS="90"
RETAIN_RESOLVED_FOR_DAYS="30"
```

## Documentation

- **[Quick Start Guide](./docs/QUICKSTART.md)** - Get running in 5 minutes
- **[Integration Guide](./docs/INTEGRATION_GUIDE.md)** - CI/CD integration with examples
- **[OAuth Setup Guide](./docs/OAUTH_SETUP.md)** - Configure Google, GitHub, and GitLab OAuth

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
