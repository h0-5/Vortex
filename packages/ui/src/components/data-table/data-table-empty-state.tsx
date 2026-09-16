import * as React from 'react';

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '../empty.js';

export interface DataTableEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function DataTableEmptyState({
  title = 'No results',
  description = 'There are no rows to display.',
  icon,
}: DataTableEmptyStateProps) {
  return (
    <Empty className="min-h-48 border-0">
      <EmptyHeader>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
