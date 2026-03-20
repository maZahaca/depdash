import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { requireViewAccess } from "@/lib/auth-utils";

export default async function AnalyticsPage() {
  await requireViewAccess("analytics");

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
