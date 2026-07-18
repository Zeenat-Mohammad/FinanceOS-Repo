import { Card } from '@/shared/components';

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-16 animate-pulse rounded-brand bg-surface/60" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse bg-surface/50" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="h-72 animate-pulse bg-surface/50 xl:col-span-8" />
        <Card className="h-72 animate-pulse bg-surface/50 xl:col-span-4" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-56 animate-pulse bg-surface/50" />
        <Card className="h-56 animate-pulse bg-surface/50" />
        <Card className="h-56 animate-pulse bg-surface/50" />
      </div>
    </div>
  );
}
