import { SearchIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn.js';
import { Button } from '../button.js';
import { Input } from '../input.js';

export interface DataTableToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  className?: string;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
  className,
}: DataTableToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-1 items-center gap-2">
        {onSearchChange ? (
          <div className="relative max-w-sm flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={search ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-8"
            />
            {search ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                <XIcon className="size-3 text-muted-foreground" />
              </Button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
