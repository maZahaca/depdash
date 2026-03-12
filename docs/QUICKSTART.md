# DepDash Quick Start Guide

Get started with DepDash in 5 minutes.

## Prerequisites

- Docker Desktop running (for PostgreSQL)
- Node.js 20+ installed
- A repository with dependencies to scan

## 1. Setup DepDash

```bash
# Clone the repository
git clone https://github.com/yourorg/depdash.git
cd depdash

# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Setup database
npm run db:push
npm run db:seed

# Start DepDash
npm run dev
```

DepDash will be running at **http://localhost:3000**

## 2. Login

Default credentials (from seed):
- **Email:** admin@depdash.dev
- **Password:** password

## 3. Generate API Token

1. Navigate to **Integrations** page
2. Click **"Generate New Token"**
3. Name it (e.g., "Test Token")
4. **Copy the token** - you won't see it again!

Example token: `dep_a1b2c3d4e5f6...`

## 4. Send Your First Scan

### NPM Example

```bash
# In your Node.js project
npm audit --json > audit-report.json

# Send to DepDash
curl -X POST http://localhost:3000/api/v1/audits \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "repository": "my-org/my-app",
  "ecosystem": "NPM",
  "path": ".",
  "report": $(cat audit-report.json)
}
EOF
```

### Python Example

```bash
# In your Python project
pip install pip-audit
pip-audit --format json > pip-audit-report.json

# Send to DepDash
curl -X POST http://localhost:3000/api/v1/audits \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "repository": "my-org/my-app",
  "ecosystem": "PYTHON",
  "path": ".",
  "report": $(cat pip-audit-report.json)
}
EOF
```

### Go Example

```bash
# In your Go project
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck -json ./... 2>&1 | jq -s '.' > govulncheck-report.json

# Send to DepDash
curl -X POST http://localhost:3000/api/v1/audits \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "repository": "my-org/my-app",
  "ecosystem": "GO",
  "path": ".",
  "report": $(cat govulncheck-report.json)
}
EOF
```

### Docker Example

```bash
# Scan a Docker image
docker pull alpine:latest
trivy image --format json alpine:latest > trivy-report.json

# Send to DepDash
curl -X POST http://localhost:3000/api/v1/audits \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "repository": "my-org/my-app",
  "ecosystem": "DOCKER",
  "dependencyType": "DOCKER_IMAGE",
  "path": "Dockerfile",
  "imageName": "alpine",
  "imageDigest": "latest",
  "report": $(cat trivy-report.json)
}
EOF
```

## 5. View Vulnerabilities

1. Navigate to **Vulnerabilities** page
2. You should see vulnerabilities from your scan
3. Click on any vulnerability to see details

## 6. (Optional) Setup Slack Notifications

1. Go to **Integrations** page
2. Scroll to **Slack Notifications** section
3. Enter your Slack webhook URL
4. Click **"Send Test"** to verify
5. Click **"Save Webhook"**

Get a Slack webhook: https://api.slack.com/messaging/webhooks

## Next Steps

- **CI/CD Integration:** See [Integration Guide](./INTEGRATION_GUIDE.md)
- **Bulk Actions:** Select multiple vulnerabilities to mark as accepted risk, false positive, etc.
- **Fix Timelines:** Configure in **Settings** page
- **Filters:** Use severity and status filters to focus on critical issues

## Common Issues

### "No vulnerabilities appearing"

Make sure:
1. The scanner found vulnerabilities (check the JSON file)
2. You're using the correct JSON format flag
3. Your API token is valid

### "Invalid API token"

Double-check:
1. Token is copied correctly (no extra spaces)
2. Token starts with `dep_`
3. Token hasn't been revoked

### Database not running

```bash
docker-compose up -d
```

## Full Documentation

See [docs/INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for:
- GitHub Actions examples
- GitLab CI examples
- Mono-repo support
- Advanced configurations
- Troubleshooting
