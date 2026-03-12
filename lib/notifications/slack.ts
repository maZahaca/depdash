import { Severity } from "@prisma/client";

export interface SlackNotificationPayload {
  text: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

export async function sendSlackNotification(
  webhookUrl: string,
  payload: SlackNotificationPayload
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return false;
  }
}

export function formatVulnerabilityNotification(
  vulnerabilities: Array<{
    dependencyName: string;
    currentVersion: string | null;
    advisory: {
      title: string;
      severity: Severity;
      cve: string | null;
    };
    project: {
      repository: {
        name: string;
      };
      path: string;
    };
  }>,
  organizationName: string,
  repositoryName?: string
): SlackNotificationPayload {
  const criticalCount = vulnerabilities.filter(
    (v) => v.advisory.severity === "CRITICAL"
  ).length;
  const highCount = vulnerabilities.filter(
    (v) => v.advisory.severity === "HIGH"
  ).length;

  const severityEmoji = (severity: Severity) => {
    switch (severity) {
      case "CRITICAL":
        return "🔴";
      case "HIGH":
        return "🟠";
      case "MEDIUM":
        return "🟡";
      case "LOW":
        return "🔵";
      default:
        return "⚪";
    }
  };

  const title = repositoryName
    ? `New vulnerabilities detected in ${repositoryName}`
    : `New vulnerabilities detected`;

  const summary =
    criticalCount > 0 || highCount > 0
      ? `${criticalCount} Critical, ${highCount} High severity issues found`
      : `${vulnerabilities.length} vulnerabilities found`;

  const blocks: SlackNotificationPayload["blocks"] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: title,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${summary}*\nOrganization: ${organizationName}`,
      },
    },
  ];

  // Add top 5 vulnerabilities
  const topVulns = vulnerabilities.slice(0, 5);
  topVulns.forEach((vuln) => {
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Package:*\n${vuln.dependencyName}@${vuln.currentVersion || "unknown"}`,
        },
        {
          type: "mrkdwn",
          text: `*Severity:*\n${severityEmoji(vuln.advisory.severity)} ${vuln.advisory.severity}`,
        },
        {
          type: "mrkdwn",
          text: `*Issue:*\n${vuln.advisory.title}`,
        },
        {
          type: "mrkdwn",
          text: `*Location:*\n${vuln.project.repository.name} (${vuln.project.path})`,
        },
      ],
    });
  });

  if (vulnerabilities.length > 5) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_...and ${vulnerabilities.length - 5} more vulnerabilities_`,
      },
    });
  }

  return {
    text: `${title}: ${summary}`,
    blocks,
  };
}

export function formatTestNotification(organizationName: string): SlackNotificationPayload {
  return {
    text: `DepDash test notification from ${organizationName}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "DepDash Test Notification",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Your Slack integration is working correctly for *${organizationName}*! You will receive notifications here when new vulnerabilities are detected.`,
        },
      },
    ],
  };
}
