import { Alert, AlertDescription, AlertTitle, Button } from '@vortex/ui';
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react';

export function ErrorState({
  title = 'Unable to load this page',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{message}</span>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon data-icon="inline-start" />
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
