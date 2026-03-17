"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ecosystem } from "@prisma/client";

interface ScanFiltersProps {
  repositories: Array<{ name: string }>;
}

export function ScanFilters({ repositories }: ScanFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-sm font-medium">Repository</label>
            <select
              className="ml-2 border rounded px-3 py-1.5 bg-white"
              value={searchParams.get('repository') || ''}
              onChange={(e) => handleFilterChange('repository', e.target.value)}
            >
              <option value="">All Repositories</option>
              {repositories.map((repo) => (
                <option key={repo.name} value={repo.name}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Ecosystem</label>
            <select
              className="ml-2 border rounded px-3 py-1.5 bg-white"
              value={searchParams.get('ecosystem') || ''}
              onChange={(e) => handleFilterChange('ecosystem', e.target.value)}
            >
              <option value="">All Ecosystems</option>
              {Object.values(Ecosystem).map((eco) => (
                <option key={eco} value={eco}>
                  {eco}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
