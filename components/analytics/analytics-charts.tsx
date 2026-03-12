"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  vulnerabilityTrends: Array<{
    date: string;
    total: number;
    new: number;
    resolved: number;
  }>;
  resolutionStats: {
    resolved: number;
    acceptedRisk: number;
    falsePositive: number;
    wontFix: number;
    total: number;
  };
  severityDistribution: Array<{
    severity: string;
    count: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  topRepositories: Array<{
    name: string;
    totalVulns: number;
  }>;
  resolutionTimeMetrics: {
    averageDays: number;
    medianDays: number;
    minDays: number;
    maxDays: number;
  };
  ecosystemBreakdown: Array<{
    ecosystem: string;
    count: number;
  }>;
}

const SEVERITY_COLORS = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#f59e0b",
  LOW: "#3b82f6",
  INFO: "#6b7280",
};

const STATUS_COLORS = {
  OPEN: "#dc2626",
  RESOLVED: "#16a34a",
  POSTPONED: "#f59e0b",
  ACCEPTED_RISK: "#3b82f6",
  FALSE_POSITIVE: "#6b7280",
  WONT_FIX: "#9333ea",
};

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/analytics?days=${days}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Closed</CardDescription>
            <CardTitle className="text-3xl">{data.resolutionStats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              In last {days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Auto-Resolved</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {data.resolutionStats.resolved}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Fixed by updates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Resolution Time</CardDescription>
            <CardTitle className="text-3xl">
              {data.resolutionTimeMetrics.averageDays}d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Median: {data.resolutionTimeMetrics.medianDays}d
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accepted Risk</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {data.resolutionStats.acceptedRisk}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Manual decisions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerability Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Trends</CardTitle>
          <CardDescription>
            Daily vulnerability detection and resolution over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.vulnerabilityTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="new"
                stroke="#dc2626"
                name="New Vulnerabilities"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="#16a34a"
                name="Resolved"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                name="Total Detected"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Current open vulnerabilities by severity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.severityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ severity, count }: any) => `${severity}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.severityDistribution.map((entry) => (
                    <Cell
                      key={`cell-${entry.severity}`}
                      fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>All vulnerabilities by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6">
                  {data.statusDistribution.map((entry) => (
                    <Cell
                      key={`cell-${entry.status}`}
                      fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resolution Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>How Issues Were Closed</CardTitle>
            <CardDescription>Breakdown of resolution methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-sm">Auto-Resolved (Fixed)</span>
                </div>
                <div className="text-sm font-medium">{data.resolutionStats.resolved}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-sm">Accepted Risk</span>
                </div>
                <div className="text-sm font-medium">{data.resolutionStats.acceptedRisk}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  <span className="text-sm">False Positive</span>
                </div>
                <div className="text-sm font-medium">{data.resolutionStats.falsePositive}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                  <span className="text-sm">Won&apos;t Fix</span>
                </div>
                <div className="text-sm font-medium">{data.resolutionStats.wontFix}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Repositories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Repositories</CardTitle>
            <CardDescription>Repositories with most open vulnerabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topRepositories.slice(0, 10).map((repo, index) => (
                <div key={repo.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <span className="text-sm truncate max-w-[200px]">{repo.name}</span>
                  </div>
                  <span className="text-sm font-medium">{repo.totalVulns}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ecosystem Breakdown */}
      {data.ecosystemBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ecosystem Breakdown</CardTitle>
            <CardDescription>Open vulnerabilities by technology</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.ecosystemBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="ecosystem" type="category" />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
