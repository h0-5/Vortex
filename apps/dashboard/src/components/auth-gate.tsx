import { Skeleton } from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

import { currentUserQuery } from '../hooks/queries.js';
import { ApiError } from '../lib/api-client.js';
import { DashboardShell } from './dashboard-shell.js';
import { ErrorState } from './error-state.js';

export function AuthGate() {
  const userQuery = useQuery(currentUserQuery);

  if (userQuery.isLoading) {
    return <DashboardLoading />;
  }
  if (userQuery.error instanceof ApiError && userQuery.error.status === 401) {
    return <Navigate to="/" replace />;
  }
  if (userQuery.isError) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24">
        <ErrorState message={userQuery.error.message} onRetry={() => void userQuery.refetch()} />
      </main>
    );
  }
  return <DashboardShell />;
}

function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-sidebar p-5 lg:block">
        <Skeleton className="h-8 w-28" />
        <div className="mt-14 flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="flex h-16 items-center justify-end gap-2 border-b border-border px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </header>
        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
