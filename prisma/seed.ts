import { PrismaClient, Severity, Ecosystem, DependencyType, VulnStatus, MemberRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing data
  await prisma.auditScan.deleteMany();
  await prisma.repositoryVulnerability.deleteMany();
  await prisma.advisory.deleteMany();
  await prisma.project.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.slackWebhook.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create test users with password
  const hashedPassword = await bcrypt.hash('password', 10);

  // Create super admin user (system-wide, not tied to org)
  const superAdminUser = await prisma.user.create({
    data: {
      email: 'super@depdash.dev',
      name: 'Super Admin',
      password: hashedPassword,
      emailVerified: new Date(),
      isSuperAdmin: true,
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@depdash.dev',
      name: 'Owner User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@depdash.dev',
      name: 'Admin User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@depdash.dev',
      name: 'Member User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@depdash.dev',
      name: 'Viewer User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  console.log('✅ Created test users with password: password');
  console.log('   - super@depdash.dev (System SUPER_ADMIN)');
  console.log('   - owner@depdash.dev (OWNER)');
  console.log('   - admin@depdash.dev (ADMIN)');
  console.log('   - member@depdash.dev (MEMBER)');
  console.log('   - viewer@depdash.dev (VIEWER)');

  // Create test organization
  const testOrg = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme',
      active: true,
    },
  });

  console.log('✅ Created organization:', testOrg.name);

  // Add org users (not super admin)
  await prisma.organizationMember.create({
    data: {
      organizationId: testOrg.id,
      userId: ownerUser.id,
      role: MemberRole.OWNER,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: testOrg.id,
      userId: adminUser.id,
      role: MemberRole.ADMIN,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: testOrg.id,
      userId: memberUser.id,
      role: MemberRole.MEMBER,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: testOrg.id,
      userId: viewerUser.id,
      role: MemberRole.VIEWER,
    },
  });

  console.log('✅ Added users to organization (SUPER_ADMIN has system-wide access)');

  // Create organization settings
  const settings = await prisma.settings.create({
    data: {
      organizationId: testOrg.id,
      criticalDays: 7,
      highDays: 30,
      mediumDays: 90,
      lowDays: 180,
      retainScansForDays: process.env.RETAIN_SCANS_FOR_DAYS
        ? parseInt(process.env.RETAIN_SCANS_FOR_DAYS)
        : 90,
      retainResolvedForDays: process.env.RETAIN_RESOLVED_FOR_DAYS
        ? parseInt(process.env.RETAIN_RESOLVED_FOR_DAYS)
        : 30,
    },
  });

  console.log('✅ Created organization settings');
  console.log(`   Retention: Scans ${settings.retainScansForDays} days, Resolved ${settings.retainResolvedForDays} days`);

  // Create API token
  const tokenString = 'depdash_test_' + Math.random().toString(36).substring(2, 15);
  const tokenHash = await bcrypt.hash(tokenString, 10);

  await prisma.apiToken.create({
    data: {
      organizationId: testOrg.id,
      name: 'Test API Token',
      tokenHash,
      prefix: tokenString.substring(0, 8),
      createdBy: ownerUser.id,
    },
  });

  console.log('✅ Created API token:', tokenString);
  console.log('   (Save this token - it will not be shown again)');

  // Create test repositories
  const repo1 = await prisma.repository.create({
    data: {
      name: 'acme/web-app',
      organizationId: testOrg.id,
    },
  });

  const repo2 = await prisma.repository.create({
    data: {
      name: 'acme/api-service',
      organizationId: testOrg.id,
    },
  });

  console.log('✅ Created repositories');

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      repositoryId: repo1.id,
      path: '.',
      ecosystem: Ecosystem.NPM,
      dependencyType: DependencyType.CODE,
      lastScanAt: new Date(),
    },
  });

  const project2 = await prisma.project.create({
    data: {
      repositoryId: repo1.id,
      path: '.',
      ecosystem: Ecosystem.DOCKER,
      dependencyType: DependencyType.DOCKER_IMAGE,
      lastScanAt: new Date(),
    },
  });

  const project3 = await prisma.project.create({
    data: {
      repositoryId: repo2.id,
      path: '.',
      ecosystem: Ecosystem.GO,
      dependencyType: DependencyType.CODE,
      lastScanAt: new Date(Date.now() - 86400000), // 1 day ago
    },
  });

  console.log('✅ Created projects');

  // Create sample advisories
  const advisory1 = await prisma.advisory.create({
    data: {
      advisoryId: 'GHSA-xxxx-yyyy-zzzz',
      title: 'Prototype Pollution in lodash',
      url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
      severity: Severity.HIGH,
      cve: 'CVE-2023-1234',
    },
  });

  const advisory2 = await prisma.advisory.create({
    data: {
      advisoryId: 'GHSA-aaaa-bbbb-cccc',
      title: 'Cross-Site Scripting (XSS) in React',
      url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
      severity: Severity.CRITICAL,
      cve: 'CVE-2023-5678',
    },
  });

  const advisory3 = await prisma.advisory.create({
    data: {
      advisoryId: 'CVE-2023-9999',
      title: 'OpenSSL vulnerability in alpine base image',
      url: 'https://avd.aquasec.com/nvd/cve-2023-9999',
      severity: Severity.HIGH,
      cve: 'CVE-2023-9999',
    },
  });

  const advisory4 = await prisma.advisory.create({
    data: {
      advisoryId: 'GO-2024-1234',
      title: 'SQL Injection in database/sql driver',
      url: 'https://pkg.go.dev/vuln/GO-2024-1234',
      severity: Severity.MEDIUM,
      cve: null,
    },
  });

  console.log('✅ Created advisories');

  // Create vulnerabilities
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Critical vulnerability - overdue
  await prisma.repositoryVulnerability.create({
    data: {
      projectId: project1.id,
      advisoryId: advisory2.id,
      dependencyName: 'react',
      versionRange: '>=16.0.0 <18.2.1',
      currentVersion: '18.1.0',
      isFixAvailable: true,
      fixedVersion: '18.2.1',
      firstSeenAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      lastSeenAt: now,
      fixByDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days overdue
      status: VulnStatus.OPEN,
    },
  });

  // High vulnerability - in timeline
  await prisma.repositoryVulnerability.create({
    data: {
      projectId: project1.id,
      advisoryId: advisory1.id,
      dependencyName: 'lodash',
      versionRange: '<4.17.21',
      currentVersion: '4.17.20',
      isFixAvailable: true,
      fixedVersion: '4.17.21',
      firstSeenAt: weekAgo,
      lastSeenAt: now,
      fixByDate: new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000), // 23 days left
      status: VulnStatus.OPEN,
    },
  });

  // Docker image vulnerability
  await prisma.repositoryVulnerability.create({
    data: {
      projectId: project2.id,
      advisoryId: advisory3.id,
      dependencyName: 'openssl',
      versionRange: '<3.0.8-r0',
      currentVersion: '3.0.7-r0',
      isFixAvailable: true,
      fixedVersion: '3.0.8-r0',
      firstSeenAt: weekAgo,
      lastSeenAt: now,
      fixByDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      status: VulnStatus.OPEN,
    },
  });

  // Postponed vulnerability
  await prisma.repositoryVulnerability.create({
    data: {
      projectId: project3.id,
      advisoryId: advisory4.id,
      dependencyName: 'github.com/lib/pq',
      versionRange: '<1.10.9',
      currentVersion: '1.10.8',
      isFixAvailable: true,
      fixedVersion: '1.10.9',
      firstSeenAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      lastSeenAt: now,
      fixByDate: new Date(now.getTime() + 76 * 24 * 60 * 60 * 1000),
      status: VulnStatus.POSTPONED,
      statusChangedAt: now,
      statusChangedBy: ownerUser.id,
      statusNote: 'Waiting for next major version release',
      postponedUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('✅ Created vulnerabilities');

  // Create audit scans
  await prisma.auditScan.create({
    data: {
      projectId: project1.id,
      scannedAt: now,
      source: 'github-actions',
      jobUrl: 'https://github.com/acme/web-app/actions/runs/123456',
      commitSha: 'abc123def456',
      branch: 'main',
      vulnCount: 2,
      newCount: 0,
      resolvedCount: 0,
    },
  });

  await prisma.auditScan.create({
    data: {
      projectId: project3.id,
      scannedAt: new Date(now.getTime() - 86400000),
      source: 'github-actions',
      jobUrl: 'https://github.com/acme/api-service/actions/runs/123457',
      commitSha: 'def456abc789',
      branch: 'main',
      vulnCount: 1,
      newCount: 1,
      resolvedCount: 0,
    },
  });

  console.log('✅ Created audit scans');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📧 Test User Emails (all with password "password"):');
  console.log('   - super@depdash.dev (System SUPER_ADMIN - not tied to org)');
  console.log('   - owner@depdash.dev (OWNER)');
  console.log('   - admin@depdash.dev (ADMIN)');
  console.log('   - member@depdash.dev (MEMBER)');
  console.log('   - viewer@depdash.dev (VIEWER)');
  console.log('🔑 API Token:', tokenString);
  console.log('🏢 Organization: Acme Corporation (slug: acme)');
  console.log('\n💡 Use these credentials to login and test the application');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
