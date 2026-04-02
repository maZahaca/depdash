import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSuperAdmin } from "@/lib/auth-utils";
import { OrganizationsList } from "@/components/organizations/organizations-list";
import { AddOrganizationForm } from "@/components/organizations/add-organization-form";

export default async function OrganizationsPage() {
  await requireSuperAdmin();

  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          members: true,
          repositories: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">
          Manage all organizations in the system
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>
              Add a new organization to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddOrganizationForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Organizations</CardTitle>
            <CardDescription>
              {organizations.length} organization(s) in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationsList organizations={organizations} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
