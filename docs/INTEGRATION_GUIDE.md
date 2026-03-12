# DepDash Integration Guide

This guide shows how to integrate DepDash into your CI/CD pipeline to automatically scan for vulnerabilities and track them across your organization.

## Table of Contents

- [Quick Start](#quick-start)
- [API Token Setup](#api-token-setup)
- [Supported Ecosystems](#supported-ecosystems)
- [CI/CD Integration Examples](#cicd-integration-examples)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

1. Generate an API token in DepDash (Integrations page)
2. Run your security scanner with JSON output
3. Send the report to DepDash API
4. View vulnerabilities in the dashboard

---

## API Token Setup

### 1. Generate API Token

Navigate to **Integrations** in your DepDash dashboard:

```
https://your-depdash-instance.com/dashboard/integrations
```

Click **"Generate New Token"** and give it a descriptive name (e.g., "GitHub Actions CI").

**Important:** Copy the token immediately - it won't be shown again!

### 2. Store Token Securely

Store the token as a secret in your CI/CD system:

**GitHub Actions:**
```bash
Settings → Secrets and variables → Actions → New repository secret
Name: DEPDASH_TOKEN
Value: dep_your_token_here
```

**GitLab CI:**
```bash
Settings → CI/CD → Variables → Add Variable
Key: DEPDASH_TOKEN
Value: dep_your_token_here
Flags: Masked
```

---

## Supported Ecosystems

DepDash supports the following security scanners:

| Ecosystem | Scanner | Command | Dependency Type |
|-----------|---------|---------|-----------------|
| NPM (JavaScript/Node.js) | npm audit | `npm audit --json` | CODE |
| Go | govulncheck | `govulncheck -json ./...` | CODE |
| Python | pip-audit | `pip-audit --format json` | CODE |
| Docker | Trivy | `trivy image --format json <image>` | DOCKER_IMAGE |

---

## CI/CD Integration Examples

### NPM (JavaScript/Node.js)

#### GitHub Actions

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        id: audit
        run: npm audit --json > audit-report.json
        continue-on-error: true

      - name: Send report to DepDash
        if: always()
        run: |
          curl -X POST https://depdash.your-company.com/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @- <<EOF
          {
            "repository": "${{ github.repository }}",
            "ecosystem": "NPM",
            "dependencyType": "CODE",
            "path": ".",
            "report": $(cat audit-report.json),
            "commitSha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}",
            "scanSource": "GitHub Actions",
            "scanJobUrl": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          }
          EOF
```

#### GitLab CI

```yaml
# .gitlab-ci.yml
npm-security-scan:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm audit --json > audit-report.json || true
    - |
      curl -X POST https://depdash.your-company.com/api/v1/audits \
        -H "Authorization: Bearer $DEPDASH_TOKEN" \
        -H "Content-Type: application/json" \
        -d @- <<EOF
      {
        "repository": "$CI_PROJECT_PATH",
        "ecosystem": "NPM",
        "dependencyType": "CODE",
        "path": ".",
        "report": $(cat audit-report.json),
        "commitSha": "$CI_COMMIT_SHA",
        "branch": "$CI_COMMIT_BRANCH",
        "scanSource": "GitLab CI",
        "scanJobUrl": "$CI_JOB_URL"
      }
      EOF
  allow_failure: true
```

---

### Go (govulncheck)

#### GitHub Actions

```yaml
name: Go Security Scan

on: [push, pull_request]

jobs:
  govulncheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Install govulncheck
        run: go install golang.org/x/vuln/cmd/govulncheck@latest

      - name: Run govulncheck
        id: scan
        run: govulncheck -json ./... > govulncheck-report.jsonl 2>&1 || true

      - name: Convert to JSON array
        run: |
          jq -s '.' govulncheck-report.jsonl > govulncheck-report.json

      - name: Send report to DepDash
        if: always()
        run: |
          curl -X POST https://depdash.your-company.com/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @- <<EOF
          {
            "repository": "${{ github.repository }}",
            "ecosystem": "GO",
            "dependencyType": "CODE",
            "path": ".",
            "report": $(cat govulncheck-report.json),
            "commitSha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}",
            "scanSource": "GitHub Actions",
            "scanJobUrl": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          }
          EOF
```

---

### Python (pip-audit)

#### GitHub Actions

```yaml
name: Python Security Scan

on: [push, pull_request]

jobs:
  pip-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pip-audit

      - name: Run pip-audit
        id: audit
        run: pip-audit --format json > pip-audit-report.json || true

      - name: Send report to DepDash
        if: always()
        run: |
          curl -X POST https://depdash.your-company.com/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @- <<EOF
          {
            "repository": "${{ github.repository }}",
            "ecosystem": "PYTHON",
            "dependencyType": "CODE",
            "path": ".",
            "report": $(cat pip-audit-report.json),
            "commitSha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}",
            "scanSource": "GitHub Actions",
            "scanJobUrl": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          }
          EOF
```

---

### Docker (Trivy)

#### GitHub Actions

```yaml
name: Docker Security Scan

on:
  push:
    branches: [main]
    paths:
      - 'Dockerfile'
      - '.github/workflows/docker-scan.yml'

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'json'
          output: 'trivy-report.json'

      - name: Send report to DepDash
        if: always()
        run: |
          curl -X POST https://depdash.your-company.com/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @- <<EOF
          {
            "repository": "${{ github.repository }}",
            "ecosystem": "DOCKER",
            "dependencyType": "DOCKER_IMAGE",
            "path": "Dockerfile",
            "report": $(cat trivy-report.json),
            "imageName": "myapp",
            "imageDigest": "${{ github.sha }}",
            "commitSha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}",
            "scanSource": "Trivy",
            "scanJobUrl": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          }
          EOF
```

---

## Mono-repo Support

For mono-repos with multiple projects, scan each directory separately:

```yaml
name: Mono-repo Security Scan

on: [push]

jobs:
  scan-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm audit --json > audit-report.json || true

      - name: Send frontend report
        run: |
          curl -X POST https://depdash.your-company.com/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @- <<EOF
          {
            "repository": "${{ github.repository }}",
            "ecosystem": "NPM",
            "dependencyType": "CODE",
            "path": "frontend",
            "report": $(cat frontend/audit-report.json),
            "commitSha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}"
          }
          EOF

  scan-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan backend
        working-directory: ./backend
        run: |
          pip install -r requirements.txt
          pip install pip-audit
          pip-audit --format json > pip-audit-report.json || true

      - name: Send backend report
        run: |
          curl -X POST https://depdash.your-company.com/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @- <<EOF
          {
            "repository": "${{ github.repository }}",
            "ecosystem": "PYTHON",
            "dependencyType": "CODE",
            "path": "backend",
            "report": $(cat backend/pip-audit-report.json),
            "commitSha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}"
          }
          EOF
```

---

## API Reference

### POST /api/v1/audits

Ingest a security audit report.

**Authentication:** Bearer token (API token from DepDash)

**Request Body:**

```typescript
{
  // Required fields
  "repository": string,        // Repository name (e.g., "myorg/myapp")
  "ecosystem": string,          // NPM | GO | PYTHON | DOCKER | NUGET | SWIFT | ANDROID
  "report": object | string,    // The audit report (JSON object or JSON string)

  // Optional fields
  "path": string,              // Path within repo (default: ".")
  "dependencyType": string,    // CODE | DOCKER_IMAGE (default: CODE)
  "imageName": string,         // For Docker scans
  "imageDigest": string,       // For Docker scans
  "commitSha": string,         // Git commit SHA
  "branch": string,            // Git branch name
  "scanSource": string,        // Scanner name (e.g., "GitHub Actions")
  "scanJobUrl": string         // URL to CI job
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "repository": "myorg/myapp",
    "path": ".",
    "ecosystem": "NPM",
    "dependencyType": "CODE",
    "vulnCount": 5,
    "newCount": 3,
    "resolvedCount": 2,
    "reopenedCount": 0
  }
}
```

**Response (400 Bad Request):**

```json
{
  "error": "Validation error",
  "details": [
    {
      "path": ["ecosystem"],
      "message": "Invalid enum value. Expected 'NPM' | 'GO' | 'PYTHON' | 'DOCKER' | 'NUGET' | 'SWIFT' | 'ANDROID'"
    }
  ]
}
```

**Response (401 Unauthorized):**

```json
{
  "error": "Invalid API token"
}
```

---

## Testing Your Integration

### 1. Manual Test with cURL

```bash
# Generate a sample npm audit report
npm audit --json > test-report.json

# Send to DepDash
curl -X POST https://depdash.your-company.com/api/v1/audits \
  -H "Authorization: Bearer dep_your_token_here" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "repository": "test/integration",
  "ecosystem": "NPM",
  "path": ".",
  "report": $(cat test-report.json)
}
EOF
```

### 2. Verify in Dashboard

1. Navigate to **Vulnerabilities** page
2. Filter by repository: `test/integration`
3. Verify vulnerabilities appear

---

## Troubleshooting

### Issue: "Invalid API token"

**Cause:** Token is incorrect or has been revoked.

**Solution:**
1. Verify token is correct in your CI secrets
2. Check token hasn't been revoked in DepDash
3. Generate a new token if needed

---

### Issue: "Validation error"

**Cause:** Request body doesn't match expected schema.

**Solution:**
- Ensure `ecosystem` is one of: NPM, GO, PYTHON, DOCKER, NUGET, SWIFT, ANDROID
- Ensure `repository` field is provided
- Ensure `report` is valid JSON

---

### Issue: No vulnerabilities appearing

**Possible causes:**

1. **Report format incorrect**
   - Verify scanner output format
   - NPM: `npm audit --json` (not `--audit-level`)
   - Go: `govulncheck -json` (not plain text)
   - Python: `pip-audit --format json`
   - Trivy: `--format json`

2. **No vulnerabilities in report**
   - Check the scanner found vulnerabilities
   - Verify dependencies are installed before scanning

3. **Organization mismatch**
   - Ensure API token belongs to correct organization

---

### Issue: Scan failures in CI

**Cause:** Scanner exits with non-zero code when vulnerabilities found.

**Solution:** Use `continue-on-error: true` (GitHub) or `|| true` (bash):

```yaml
# GitHub Actions
- name: Run npm audit
  run: npm audit --json > audit-report.json
  continue-on-error: true
```

```bash
# GitLab CI / Shell
npm audit --json > audit-report.json || true
```

---

## Best Practices

### 1. Scan Frequently

Run scans on:
- Every commit to main/master
- Pull requests
- Scheduled (daily/weekly)

### 2. Use Descriptive Repository Names

Use full repository path for clarity:
```json
{
  "repository": "myorg/backend-api"  // Good
  "repository": "backend"             // Not ideal
}
```

### 3. Include Scan Metadata

Always include when available:
- `commitSha` - for tracking which code version
- `branch` - for branch-specific tracking
- `scanJobUrl` - for traceability back to CI

### 4. Handle Mono-repos Properly

Scan each sub-project with unique `path`:
```json
{
  "repository": "myorg/monorepo",
  "path": "packages/frontend",
  ...
}
```

### 5. Set Up Slack Notifications

Configure Slack webhooks in DepDash Integrations to get notified of new critical/high vulnerabilities.

---

## Example: Complete GitHub Actions Workflow

```yaml
# .github/workflows/security.yml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 8 * * 1' # Weekly on Monday

env:
  DEPDASH_URL: https://depdash.your-company.com

jobs:
  npm-scan:
    runs-on: ubuntu-latest
    if: hashFiles('package.json') != ''
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm audit --json > audit.json || true

      - name: Upload to DepDash
        if: always()
        run: |
          curl -X POST ${{ env.DEPDASH_URL }}/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"repository\": \"${{ github.repository }}\",
              \"ecosystem\": \"NPM\",
              \"path\": \".\",
              \"report\": $(cat audit.json),
              \"commitSha\": \"${{ github.sha }}\",
              \"branch\": \"${{ github.ref_name }}\",
              \"scanSource\": \"GitHub Actions\",
              \"scanJobUrl\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
            }"

  docker-scan:
    runs-on: ubuntu-latest
    if: hashFiles('Dockerfile') != ''
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t app:${{ github.sha }} .

      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: app:${{ github.sha }}
          format: json
          output: trivy.json

      - name: Upload to DepDash
        if: always()
        run: |
          curl -X POST ${{ env.DEPDASH_URL }}/api/v1/audits \
            -H "Authorization: Bearer ${{ secrets.DEPDASH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"repository\": \"${{ github.repository }}\",
              \"ecosystem\": \"DOCKER\",
              \"dependencyType\": \"DOCKER_IMAGE\",
              \"path\": \"Dockerfile\",
              \"report\": $(cat trivy.json),
              \"imageName\": \"app\",
              \"imageDigest\": \"${{ github.sha }}\",
              \"commitSha\": \"${{ github.sha }}\",
              \"branch\": \"${{ github.ref_name }}\",
              \"scanSource\": \"Trivy\",
              \"scanJobUrl\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
            }"
```

---

## Need Help?

- **Documentation:** [Full docs](https://docs.depdash.com)
- **Issues:** [GitHub Issues](https://github.com/yourorg/depdash/issues)
- **Support:** security@your-company.com
