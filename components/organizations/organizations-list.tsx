"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Organization = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  _count: {
    members: number;
    repositories: number;
  };
};

export function OrganizationsList({
  organizations,
}: {
  organizations: Organization[];
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleToggleActive(orgId: string, currentActive: boolean) {
    const action = currentActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this organization?`)) {
      return;
    }

    setUpdatingId(orgId);

    try {
      const response = await fetch(`/api/v1/organizations/${orgId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !currentActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update organization");
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {organizations.map((org) => (
        <div
          key={org.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-sm text-muted-foreground">
                  Slug: {org.slug}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  org.active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {org.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <span>{org._count.members} members</span>
              <span>{org._count.repositories} repositories</span>
              <span>Created {new Date(org.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <Button
            variant={org.active ? "outline" : "default"}
            size="sm"
            onClick={() => handleToggleActive(org.id, org.active)}
            disabled={updatingId === org.id}
          >
            {updatingId === org.id
              ? "Updating..."
              : org.active
              ? "Deactivate"
              : "Activate"}
          </Button>
        </div>
      ))}

      {organizations.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No organizations found
        </p>
      )}
    </div>
  );
}
