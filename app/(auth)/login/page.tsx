import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">DepDash</CardTitle>
          <CardDescription>Dependency Vulnerability Dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {params.error}
            </div>
          )}
          <form
            action={async (formData) => {
              "use server";
              try {
                await signIn("credentials", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/dashboard",
                });
              } catch (e) {
                console.error("Login failed:", e);
                redirect("/login?error=Invalid credentials");
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="admin@depdash.dev"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="space-y-2">
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <Button variant="outline" className="w-full" type="submit">
                Continue with Google
              </Button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("github");
              }}
            >
              <Button variant="outline" className="w-full" type="submit">
                Continue with GitHub
              </Button>
            </form>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            For testing, use: admin@depdash.dev / password
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
