import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Must be logged in
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Must be super admin
  if (!session.user.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/DepDash.svg" alt="DepDash" width={32} height={32} />
              <span className="text-2xl font-bold">DepDash</span>
              <span className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                Admin
              </span>
            </Link>
            <nav className="flex space-x-4">
              <Link
                href="/admin"
                className="text-sm font-medium hover:text-primary"
              >
                Overview
              </Link>
              <Link
                href="/admin/organizations"
                className="text-sm font-medium hover:text-primary"
              >
                Organizations
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
