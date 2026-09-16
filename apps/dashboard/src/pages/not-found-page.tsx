import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@vortex/ui';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Empty className="w-full max-w-lg">
        <EmptyHeader>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>The requested Vortex page does not exist.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/dashboard">Return to dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
