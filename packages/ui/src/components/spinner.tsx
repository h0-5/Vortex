import { LoaderCircleIcon } from 'lucide-react';
import type * as React from 'react';

import { cn } from '../lib/cn.js';

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <LoaderCircleIcon
      role="status"
      aria-label="Loading"
      className={cn('animate-spin', className)}
      {...props}
    />
  );
}
