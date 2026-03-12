"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SlackWebhookFormProps {
  organizationId: string;
  initialWebhookUrl: string;
}

export function SlackWebhookForm({
  organizationId,
  initialWebhookUrl,
}: SlackWebhookFormProps) {
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          slackWebhookUrl: webhookUrl || null,
        }),
      });

      if (response.ok) {
        alert("Slack webhook saved successfully!");
      } else {
        alert("Failed to save webhook");
      }
    } catch (error) {
      alert("Error saving webhook");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      alert("Please enter a webhook URL first");
      return;
    }

    setTestLoading(true);

    try {
      const response = await fetch("/api/v1/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
        }),
      });

      if (response.ok) {
        alert("Test notification sent! Check your Slack channel.");
      } else {
        const data = await response.json();
        alert(`Failed to send test: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("Error sending test notification");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Slack Webhook URL
        </label>
        <Input
          placeholder="https://hooks.slack.com/services/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Get your webhook URL from{" "}
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Slack Incoming Webhooks
          </a>
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Webhook"}
        </Button>
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testLoading || !webhookUrl}
        >
          {testLoading ? "Sending..." : "Send Test"}
        </Button>
        {webhookUrl && (
          <Button
            variant="ghost"
            onClick={() => setWebhookUrl("")}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
