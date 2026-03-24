"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrgSelectorProps {
  organizations: Organization[];
  currentOrgId?: string;
  currentOrgName?: string;
}

export function OrgSelector({ organizations, currentOrgId, currentOrgName }: OrgSelectorProps) {
  const { update } = useSession();
  const router = useRouter();

  const switchOrg = async (orgId: string) => {
    if (orgId === currentOrgId) return;

    try {
      const response = await fetch("/api/v1/auth/select-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch organization");
      }

      await update({ organizationId: orgId });
      router.refresh();
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  };

  return (
    <Select value={currentOrgId || ""} onValueChange={switchOrg}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select Organization">
          {currentOrgName || "Select Organization"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            <div className="flex flex-col">
              <span>{org.name}</span>
              <span className="text-xs text-muted-foreground">@{org.slug}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
