import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardPage() {
  // Ensure user is authenticated before redirecting
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect("/dashboard/vulnerabilities");
}
