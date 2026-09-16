import type * as React from 'react';

import { cn } from '../lib/cn.js';

export function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-8 text-center',
        className,
      )}
      {...props}
    />
  );
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 data-slot="empty-title" className={cn('font-medium', className)} {...props} />;
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  );
}
