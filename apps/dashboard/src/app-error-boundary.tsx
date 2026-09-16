import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@vortex/ui';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function AppErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Empty className="w-full max-w-lg">
        <EmptyHeader>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.location.reload()}>Reload application</Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
