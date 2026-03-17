import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/DepDash.svg" alt="DepDash" className="h-8 w-8" />
            <span className="text-2xl font-bold">DepDash</span>
          </Link>
          <Link href={session?.user ? "/dashboard" : "/login"}>
            <Button>{session?.user ? "Go to Dashboard" : "Sign In"}</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Dependency Vulnerability Dashboard
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Track, monitor, and fix security vulnerabilities in your dependencies across all your projects
        </p>
        <div className="flex gap-4 justify-center">
          <Link href={session?.user ? "/dashboard" : "/login"}>
            <Button size="lg">
              {session?.user ? "Go to Dashboard" : "Get Started"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Multi-Ecosystem Support</h3>
            <p className="text-muted-foreground">
              Support for NPM, Go, Python, Docker, and more. Monitor all your dependencies in one place.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">CI/CD Integration</h3>
            <p className="text-muted-foreground">
              Seamlessly integrate with your CI/CD pipeline via API tokens for automated vulnerability scanning.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Track & Manage</h3>
            <p className="text-muted-foreground">
              Set fix timelines, track remediation progress, and manage vulnerabilities by severity.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold mb-2">Slack Notifications</h3>
            <p className="text-muted-foreground">
              Get instant alerts for new critical vulnerabilities directly in your Slack channels.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Manage users with role-based access control. Perfect for teams of any size.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-xl font-semibold mb-2">Analytics & Reporting</h3>
            <p className="text-muted-foreground">
              Visualize vulnerability trends and track your security posture over time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white p-12 rounded-lg shadow-sm max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">
            Start monitoring your dependencies for vulnerabilities today
          </p>
          <Link href={session?.user ? "/dashboard" : "/login"}>
            <Button size="lg">
              {session?.user ? "Go to Dashboard" : "Sign In"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DepDash. Dependency Vulnerability Dashboard.</p>
        </div>
      </footer>
    </div>
  );
}
