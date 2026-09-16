import { Card, CardContent, Skeleton } from '@vortex/ui';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex min-h-32 flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex min-h-32 flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
