import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { requireAuth } from "@/lib/auth-utils";
import { canView } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authContext = await requireAuth();

  // Get session for email display
  const session = await auth();

  // Get current organization name
  let currentOrgName = null;
  if (authContext.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: authContext.organizationId },
      select: { name: true },
    });
    currentOrgName = org?.name;
  }

  // Check which navigation items user can view
  const showIntegrations = authContext.isSuperAdmin || canView(authContext.role ?? undefined, "integrations");
  const showSettings = authContext.isSuperAdmin || canView(authContext.role ?? undefined, "settings");
  const showUsers = authContext.isSuperAdmin || canView(authContext.role ?? undefined, "users");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/DepDash.svg" alt="DepDash" width={32} height={32} />
              <span className="text-2xl font-bold">DepDash</span>
            </Link>
            <nav className="flex space-x-4">
              <Link
                href="/dashboard/vulnerabilities"
                className="text-sm font-medium hover:text-primary"
              >
                Vulnerabilities
              </Link>
              <Link
                href="/dashboard/repositories"
                className="text-sm font-medium hover:text-primary"
              >
                Repositories
              </Link>
              <Link
                href="/dashboard/scans"
                className="text-sm font-medium hover:text-primary"
              >
                Scans
              </Link>
              <Link
                href="/dashboard/analytics"
                className="text-sm font-medium hover:text-primary"
              >
                Analytics
              </Link>
              {showIntegrations && (
                <Link
                  href="/dashboard/integrations"
                  className="text-sm font-medium hover:text-primary"
                >
                  Integrations
                </Link>
              )}
              {showSettings && (
                <Link
                  href="/dashboard/settings"
                  className="text-sm font-medium hover:text-primary"
                >
                  Settings
                </Link>
              )}
              {showUsers && (
                <Link
                  href="/dashboard/users"
                  className="text-sm font-medium hover:text-primary"
                >
                  Users
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {currentOrgName && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Org:</span>
                <span className="text-sm font-medium">{currentOrgName}</span>
              </div>
            )}
            {authContext.isSuperAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Back to Admin
                </Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground">{session?.user?.email}</span>
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/auth");
                await signOut();
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
