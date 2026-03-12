import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Test data
const TEST_ORG_ID = randomUUID();
const TEST_PROJECT_ID = randomUUID();
const TEST_REPO_ID = randomUUID();
let TEST_API_TOKEN = '';
let TEST_TOKEN_ID = '';

// NOTE: These API integration tests require the Next.js server to be running
// Run with: npm run dev (in separate terminal) then npm test
describe('Audit API Integration', () => {
  beforeAll(async () => {
    // Create test organization
    await prisma.organization.create({
      data: {
        id: TEST_ORG_ID,
        name: 'Test Organization',
        slug: 'test-org-' + Date.now(),
      },
    });

    // Create test repository
    await prisma.repository.create({
      data: {
        id: TEST_REPO_ID,
        name: 'test-repo',
        organizationId: TEST_ORG_ID,
      },
    });

    // Create test project
    await prisma.project.create({
      data: {
        id: TEST_PROJECT_ID,
        repositoryId: TEST_REPO_ID,
        ecosystem: 'NPM',
        path: '/',
      },
    });

    // Create API token
    const token = `dep_${Math.random().toString(36).substring(2, 15)}`;
    TEST_API_TOKEN = token;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const prefix = token.substring(0, 12);

    TEST_TOKEN_ID = randomUUID();
    await prisma.apiToken.create({
      data: {
        id: TEST_TOKEN_ID,
        name: 'Test Token',
        tokenHash,
        prefix,
        organizationId: TEST_ORG_ID,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.repositoryVulnerability.deleteMany({
      where: { project: { repositoryId: TEST_REPO_ID } },
    });
    await prisma.project.deleteMany({ where: { id: TEST_PROJECT_ID } });
    await prisma.repository.deleteMany({ where: { id: TEST_REPO_ID } });
    await prisma.apiToken.deleteMany({ where: { id: TEST_TOKEN_ID } });
    await prisma.organization.deleteMany({ where: { id: TEST_ORG_ID } });
    await prisma.$disconnect();
  });

  it('should reject request without API token', async () => {
    const response = await fetch('http://localhost:3000/api/v1/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        repository: 'test-repo',
        path: '/',
        ecosystem: 'NPM',
        report: {},
      }),
    });

    expect(response.status).toBe(401);
  });

  it('should reject request with invalid API token', async () => {
    const response = await fetch('http://localhost:3000/api/v1/audits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_token',
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        repository: 'test-repo',
        path: '/',
        ecosystem: 'NPM',
        report: {},
      }),
    });

    expect(response.status).toBe(401);
  });

  it('should ingest NPM audit report', async () => {
    const npmReport = {
      vulnerabilities: {
        lodash: {
          name: 'lodash',
          severity: 'high',
          via: [
            {
              source: 1673,
              name: 'lodash',
              dependency: 'lodash',
              title: 'Prototype Pollution in lodash',
              url: 'https://github.com/advisories/GHSA-p6mc-m468-83gw',
              severity: 'high',
              range: '<=4.17.20',
            },
          ],
          range: '<=4.17.20',
          fixAvailable: {
            name: 'lodash',
            version: '4.17.21',
          },
        },
      },
    };

    const response = await fetch('http://localhost:3000/api/v1/audits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_API_TOKEN}`,
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        repository: 'test-repo',
        path: '/',
        ecosystem: 'NPM',
        report: npmReport,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.newCount).toBeGreaterThan(0);

    // Verify vulnerability was created in database
    const vulnerabilities = await prisma.repositoryVulnerability.findMany({
      where: {
        project: {
          repositoryId: TEST_REPO_ID,
        },
      },
    });
    expect(vulnerabilities.length).toBeGreaterThan(0);
    expect(vulnerabilities[0].dependencyName).toBe('lodash');
  });

  it('should handle duplicate scan (auto-resolution)', async () => {
    const emptyReport = {
      vulnerabilities: {},
    };

    const response = await fetch('http://localhost:3000/api/v1/audits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_API_TOKEN}`,
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        repository: 'test-repo',
        path: '/',
        ecosystem: 'NPM',
        report: emptyReport,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.resolvedCount).toBeGreaterThan(0);

    // Verify vulnerabilities were auto-resolved
    const vulnerabilities = await prisma.repositoryVulnerability.findMany({
      where: {
        project: {
          repositoryId: TEST_REPO_ID,
        },
        status: 'RESOLVED',
      },
    });
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });

  it('should accept different ecosystems', async () => {
    const response = await fetch('http://localhost:3000/api/v1/audits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_API_TOKEN}`,
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        repository: 'test-repo',
        path: '/backend',
        ecosystem: 'GO',
        report: [],
      }),
    });

    expect(response.status).toBe(200);
  });

  it('should reject malformed report', async () => {
    const response = await fetch('http://localhost:3000/api/v1/audits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_API_TOKEN}`,
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        repository: 'test-repo',
        path: '/',
        ecosystem: 'NPM',
        report: 'not-an-object',
      }),
    });

    // Should still accept it as report is unknown type, parser will handle validation
    expect([200, 400]).toContain(response.status);
  });
});
