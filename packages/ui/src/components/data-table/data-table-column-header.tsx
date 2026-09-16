import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, EyeOffIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn.js';
import { Button } from '../button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu.js';

interface DataTableColumnHeaderProps {
  title: string;
  sortDirection?: 'asc' | 'desc' | false;
  onSort?: () => void;
  onHide?: () => void;
  className?: string;
}

export function DataTableColumnHeader({
  title,
  sortDirection,
  onSort,
  onHide,
  className,
}: DataTableColumnHeaderProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {sortDirection === 'desc' ? (
              <ArrowDownIcon className="ml-2 size-4" />
            ) : sortDirection === 'asc' ? (
              <ArrowUpIcon className="ml-2 size-4" />
            ) : (
              <ChevronsUpDownIcon className="ml-2 size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {onSort ? (
            <DropdownMenuItem onClick={onSort}>
              <ArrowUpIcon className="mr-2 size-3.5 text-muted-foreground/70" />
              Asc
            </DropdownMenuItem>
          ) : null}
          {onSort ? (
            <DropdownMenuItem onClick={onSort}>
              <ArrowDownIcon className="mr-2 size-3.5 text-muted-foreground/70" />
              Desc
            </DropdownMenuItem>
          ) : null}
          {onSort && onHide ? <DropdownMenuSeparator /> : null}
          {onHide ? (
            <DropdownMenuItem onClick={onHide}>
              <EyeOffIcon className="mr-2 size-3.5 text-muted-foreground/70" />
              Hide
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
