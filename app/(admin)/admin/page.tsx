"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Organization {
  id: string;
  name: string;
  slug: string;
  _count?: {
    members: number;
    repositories: number;
  };
}

export default function AdminPage() {
  const { update } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/organizations")
      .then((res) => res.json())
      .then((data) => {
        setOrganizations(data.organizations || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch organizations:", error);
        setLoading(false);
      });
  }, []);

  const selectOrgAndGoToDashboard = async (orgId: string) => {
    setSelecting(true);
    try {
      const response = await fetch("/api/v1/auth/select-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        throw new Error("Failed to select organization");
      }

      await update({ organizationId: orgId });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error selecting organization:", error);
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground mt-2">
          Select an organization to view its dashboard and manage resources.
        </p>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Organizations Found</CardTitle>
            <CardDescription>
              There are no organizations in the system yet. Create one to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>@{org.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {org._count && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Members:</span>
                        <span className="font-medium">{org._count.members}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Repositories:</span>
                        <span className="font-medium">{org._count.repositories}</span>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => selectOrgAndGoToDashboard(org.id)}
                    disabled={selecting}
                    className="w-full"
                  >
                    {selecting ? "Loading..." : "View Dashboard"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
