"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsFormProps {
  settings: {
    criticalDays: number;
    highDays: number;
    mediumDays: number;
    lowDays: number;
    retainScansForDays: number | null;
    retainResolvedForDays: number | null;
  };
  organizationId: string;
}

export function SettingsForm({ settings, organizationId }: SettingsFormProps) {
  const [values, setValues] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/v1/settings?organizationId=${organizationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save settings");
      }
    } catch (error) {
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Critical (days)
          </label>
          <Input
            type="number"
            min="1"
            value={values.criticalDays}
            onChange={(e) =>
              setValues({ ...values, criticalDays: parseInt(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            High (days)
          </label>
          <Input
            type="number"
            min="1"
            value={values.highDays}
            onChange={(e) =>
              setValues({ ...values, highDays: parseInt(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Medium (days)
          </label>
          <Input
            type="number"
            min="1"
            value={values.mediumDays}
            onChange={(e) =>
              setValues({ ...values, mediumDays: parseInt(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Low (days)
          </label>
          <Input
            type="number"
            min="1"
            value={values.lowDays}
            onChange={(e) =>
              setValues({ ...values, lowDays: parseInt(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {message && (
          <span
            className={`text-sm ${
              message.includes("success") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
