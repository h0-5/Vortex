import {
  Card,
  CardContent,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
} from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { ActivityIcon, BlocksIcon, SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatRelativeTime } from '../lib/date.js';
import { api } from '../lib/api-client.js';
import { ErrorState } from './error-state.js';

export function RecentActivity() {
  const activity = useQuery({
    queryKey: ['activity', { page: 1, limit: 5 }],
    queryFn: () => api.getActivity({ page: 1, limit: 5 }),
    staleTime: 10_000,
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Recent activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest account and server events recorded across your workspace.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/activity">View all</Link>
        </Button>
      </div>
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {activity.isLoading ? (
            <ActivitySkeleton />
          ) : activity.isError ? (
            <ErrorState
              title="Unable to load activity"
              message={activity.error.message}
              onRetry={() => void activity.refetch()}
            />
          ) : !activity.data ? (
            <ActivitySkeleton />
          ) : activity.data.data.length === 0 ? (
            <Empty className="min-h-44 border-0">
              <EmptyHeader>
                <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ActivityIcon className="size-4" aria-hidden="true" />
                </span>
                <EmptyTitle>No recent activity</EmptyTitle>
                <EmptyDescription>
                  Your workspace is quiet. New core activity will appear here when available.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y">
              {activity.data.data.map((event) => (
                <li key={event.id} className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ActivityIconForType type={event.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{event.message}</p>
                    {event.guildId ? (
                      <p className="text-xs text-muted-foreground">Guild {event.guildId}</p>
                    ) : null}
                    <time className="text-xs text-muted-foreground">
                      {formatRelativeTime(event.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ActivityIconForType({ type }: { type: string }) {
  if (type.startsWith('settings.')) return <SettingsIcon className="size-4" aria-hidden="true" />;
  if (type.startsWith('plugin.')) return <BlocksIcon className="size-4" aria-hidden="true" />;
  return <ActivityIcon className="size-4" aria-hidden="true" />;
}

function ActivitySkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-start gap-3 p-4">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
