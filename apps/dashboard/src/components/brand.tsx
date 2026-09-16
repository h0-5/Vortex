import { BoxesIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@vortex/ui';

import { useAppName } from '../hooks/use-app-name.js';
import { useBranding } from '../hooks/use-branding.js';

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  const appName = useAppName();
  const branding = useBranding();

  return (
    <Link
      to="/dashboard"
      className={cn(
        'inline-flex min-w-0 items-center gap-2.5 font-semibold tracking-tight text-foreground',
        className,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground">
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="size-full object-contain" />
        ) : (
          <BoxesIcon className="size-4" aria-hidden="true" />
        )}
      </span>
      {compact ? null : <span className="truncate">{appName}</span>}
    </Link>
  );
}
