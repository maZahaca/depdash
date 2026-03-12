import { Ecosystem, DependencyType, VulnStatus, Severity } from '@prisma/client';
import prisma from '@/lib/prisma';
import { parserRegistry } from '@/lib/parsers';
import { addDays } from 'date-fns';
import { sendSlackNotification, formatVulnerabilityNotification } from '@/lib/notifications/slack';

export interface AuditInput {
  organizationId: string;
  repository: string;
  path?: string;
  ecosystem: Ecosystem;
  dependencyType?: DependencyType;
  report: unknown;
  imageName?: string;
  imageDigest?: string;
  scanSource?: string;
  scanJobUrl?: string;
  commitSha?: string;
  branch?: string;
}

export interface AuditResult {
  repository: string;
  path: string;
  ecosystem: Ecosystem;
  dependencyType: DependencyType;
  vulnCount: number;
  newCount: number;
  resolvedCount: number;
  reopenedCount: number;
}

export async function processAudit(input: AuditInput): Promise<AuditResult> {
  const {
    repository: repositoryName,
    path = '.',
    ecosystem,
    dependencyType = DependencyType.CODE,
    report,
    organizationId,
    scanSource,
    scanJobUrl,
    commitSha,
    branch,
  } = input;

  // 1. Upsert repository
  const repo = await prisma.repository.upsert({
    where: {
      organizationId_name: {
        organizationId,
        name: repositoryName,
      },
    },
    create: {
      name: repositoryName,
      organizationId,
    },
    update: {},
  });

  // 2. Upsert project
  const project = await prisma.project.upsert({
    where: {
      repositoryId_path_ecosystem_dependencyType: {
        repositoryId: repo.id,
        path,
        ecosystem,
        dependencyType,
      },
    },
    create: {
      repositoryId: repo.id,
      path,
      ecosystem,
      dependencyType,
    },
    update: {},
  });

  // 3. Get all current OPEN and POSTPONED vulnerabilities for this project
  const currentVulns = await prisma.repositoryVulnerability.findMany({
    where: {
      projectId: project.id,
      status: { in: [VulnStatus.OPEN, VulnStatus.POSTPONED] },
    },
  });

  // 4. Parse new report
  const parser = parserRegistry[ecosystem];
  const parsedVulns = parser.parse(report);

  // 5. Track seen vulnerabilities
  const seenVulnIds = new Set<string>();
  let newCount = 0;
  let reopenedCount = 0;

  // 6. Process each parsed vulnerability
  for (const parsed of parsedVulns) {
    // Upsert advisory
    const advisory = await prisma.advisory.upsert({
      where: { advisoryId: parsed.advisoryId },
      create: {
        advisoryId: parsed.advisoryId,
        title: parsed.title,
        url: parsed.url,
        severity: parsed.severity,
        cve: parsed.cve,
      },
      update: {
        title: parsed.title,
        url: parsed.url,
        severity: parsed.severity,
        cve: parsed.cve,
      },
    });

    // Check if this vulnerability already exists (any status)
    const existing = await prisma.repositoryVulnerability.findFirst({
      where: {
        projectId: project.id,
        advisoryId: advisory.id,
        dependencyName: parsed.dependencyName,
      },
    });

    if (existing) {
      // Handle permanent statuses - don't auto-reopen
      const permanentStatuses: VulnStatus[] = [VulnStatus.ACCEPTED_RISK, VulnStatus.FALSE_POSITIVE, VulnStatus.WONT_FIX];
      if (permanentStatuses.includes(existing.status)) {
        // Just update lastSeenAt, keep status unchanged
        await prisma.repositoryVulnerability.update({
          where: { id: existing.id },
          data: {
            lastSeenAt: new Date(),
            currentVersion: parsed.currentVersion,
            isFixAvailable: parsed.isFixAvailable,
            versionRange: parsed.versionRange,
            fixedVersion: parsed.fixedVersion,
          },
        });
        // Don't mark as seen for auto-resolution purposes
      } else if (existing.status === VulnStatus.RESOLVED) {
        // Re-open previously resolved vulnerability
        await prisma.repositoryVulnerability.update({
          where: { id: existing.id },
          data: {
            status: VulnStatus.OPEN,
            resolvedAt: null,
            lastSeenAt: new Date(),
            currentVersion: parsed.currentVersion,
            isFixAvailable: parsed.isFixAvailable,
            versionRange: parsed.versionRange,
            fixedVersion: parsed.fixedVersion,
            statusChangedAt: new Date(),
            statusNote: 'Vulnerability reappeared in scan',
            scanSource,
            scanJobUrl,
          },
        });
        reopenedCount++;
        seenVulnIds.add(existing.id);
      } else {
        // Update existing OPEN or POSTPONED vulnerability
        await prisma.repositoryVulnerability.update({
          where: { id: existing.id },
          data: {
            lastSeenAt: new Date(),
            currentVersion: parsed.currentVersion,
            isFixAvailable: parsed.isFixAvailable,
            versionRange: parsed.versionRange,
            fixedVersion: parsed.fixedVersion,
            scanSource,
            scanJobUrl,
          },
        });
        seenVulnIds.add(existing.id);
      }
    } else {
      // Create new vulnerability
      const settings = await getOrCreateSettings(organizationId);
      const fixByDate = calculateFixByDate(parsed.severity, settings);

      const newVuln = await prisma.repositoryVulnerability.create({
        data: {
          projectId: project.id,
          advisoryId: advisory.id,
          dependencyName: parsed.dependencyName,
          versionRange: parsed.versionRange,
          currentVersion: parsed.currentVersion,
          isFixAvailable: parsed.isFixAvailable,
          fixedVersion: parsed.fixedVersion,
          fixByDate,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          scanSource,
          scanJobUrl,
        },
      });
      newCount++;
      seenVulnIds.add(newVuln.id);
    }
  }

  // 7. Auto-resolve unseen vulnerabilities
  const unseenVulns = currentVulns.filter((v) => !seenVulnIds.has(v.id));
  const resolvedCount = unseenVulns.length;

  if (unseenVulns.length > 0) {
    await prisma.repositoryVulnerability.updateMany({
      where: {
        id: { in: unseenVulns.map((v) => v.id) },
      },
      data: {
        status: VulnStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  // 8. Record scan metadata
  await prisma.auditScan.create({
    data: {
      projectId: project.id,
      vulnCount: parsedVulns.length,
      newCount,
      resolvedCount,
      source: scanSource,
      jobUrl: scanJobUrl,
      commitSha,
      branch,
    },
  });

  // 9. Update project last scan time
  await prisma.project.update({
    where: { id: project.id },
    data: { lastScanAt: new Date() },
  });

  // 10. Send Slack notification if new or reopened vulnerabilities
  if ((newCount > 0 || reopenedCount > 0)) {
    await sendNewVulnerabilityNotification(organizationId, project.id, repositoryName);
  }

  return {
    repository: repositoryName,
    path,
    ecosystem,
    dependencyType,
    vulnCount: parsedVulns.length,
    newCount,
    resolvedCount,
    reopenedCount,
  };
}

async function getOrCreateSettings(organizationId: string) {
  let settings = await prisma.settings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        organizationId,
        criticalDays: 7,
        highDays: 30,
        mediumDays: 90,
        lowDays: 180,
      },
    });
  }

  return settings;
}

function calculateFixByDate(severity: Severity, settings: { criticalDays: number; highDays: number; mediumDays: number; lowDays: number }): Date {
  const days = {
    [Severity.CRITICAL]: settings.criticalDays,
    [Severity.HIGH]: settings.highDays,
    [Severity.MEDIUM]: settings.mediumDays,
    [Severity.LOW]: settings.lowDays,
    [Severity.INFO]: settings.lowDays,
  }[severity];

  return addDays(new Date(), days);
}

async function sendNewVulnerabilityNotification(
  organizationId: string,
  projectId: string,
  repositoryName: string
) {
  try {
    // Get organization settings with Slack webhook
    const orgSettings = await prisma.settings.findUnique({
      where: { organizationId },
      select: { slackWebhookUrl: true },
    });

    if (!orgSettings?.slackWebhookUrl) {
      return; // No webhook configured, skip notification
    }

    // Get organization name
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!org) return;

    // Get new/reopened vulnerabilities from the last minute
    const recentVulns = await prisma.repositoryVulnerability.findMany({
      where: {
        projectId,
        status: { in: [VulnStatus.OPEN, VulnStatus.POSTPONED] },
        firstSeenAt: {
          gte: new Date(Date.now() - 60000), // Last 60 seconds
        },
      },
      include: {
        advisory: true,
        project: {
          include: {
            repository: true,
          },
        },
      },
      take: 10, // Limit to top 10
      orderBy: {
        advisory: {
          severity: 'asc', // CRITICAL first
        },
      },
    });

    if (recentVulns.length === 0) return;

    // Format and send notification
    const payload = formatVulnerabilityNotification(
      recentVulns,
      org.name,
      repositoryName
    );

    await sendSlackNotification(orgSettings.slackWebhookUrl, payload);
  } catch (error) {
    console.error('Failed to send vulnerability notification:', error);
    // Don't throw - notification failure shouldn't break audit processing
  }
}
