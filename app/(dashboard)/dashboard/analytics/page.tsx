import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Vulnerability trends, resolution statistics, and insights
        </p>
      </div>

      <AnalyticsCharts />
    </div>
  );
}
