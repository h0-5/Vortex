import * as React from 'react';

import { Skeleton } from '../skeleton.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table.js';

export interface DataTableSkeletonProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export function DataTableSkeleton({
  columns = 4,
  rows = 5,
  className,
}: DataTableSkeletonProps) {
  return (
    <div className={className}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((__, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
