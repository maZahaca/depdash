import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { AddUserForm } from "@/components/users/add-user-form";
import { UsersList } from "@/components/users/users-list";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  // Get user's organization and role
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
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
      }
    },
  });

  if (!membership) {
    return <div>No organization found</div>;
  }

  // Check access - only non-VIEWER roles can access
  if (membership.role === "VIEWER") {
    notFound();
  }

  // Check if user has permission to manage users (OWNER or ADMIN)
  const canManageUsers = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage users in {membership.organization.name}
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
              <AddUserForm organizationId={membership.organizationId} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription>
              {membership.organization.members.length} member(s) in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersList
              members={membership.organization.members}
              canManageUsers={canManageUsers}
              currentUserId={session.user.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
