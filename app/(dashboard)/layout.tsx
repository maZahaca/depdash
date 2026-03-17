import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-2xl font-bold">
              DepDash
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
              <Link
                href="/dashboard/integrations"
                className="text-sm font-medium hover:text-primary"
              >
                Integrations
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-sm font-medium hover:text-primary"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
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
