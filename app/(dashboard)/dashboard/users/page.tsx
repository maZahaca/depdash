import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddUserForm } from "@/components/users/add-user-form";
import { UsersList } from "@/components/users/users-list";
import { requireViewAccess, checkEditAccess } from "@/lib/auth-utils";

export default async function UsersPage() {
  const authContext = await requireViewAccess("users");

  if (!authContext.organizationId) {
    return <div>No organization selected</div>;
  }

  // Get organization with members
  const organization = await prisma.organization.findUnique({
    where: { id: authContext.organizationId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              createdAt: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  if (!organization) {
    return <div>No organization found</div>;
  }

  // Check if user can edit (manage users)
  const canManageUsers = await checkEditAccess("users");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage users in {organization.name}
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {canManageUsers && (
          <Card>
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
              <CardDescription>
                Invite a new user to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddUserForm organizationId={authContext.organizationId!} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription>
              {organization.members.length} member(s) in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersList
              members={organization.members}
              canManageUsers={canManageUsers}
              currentUserId={authContext.userId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
