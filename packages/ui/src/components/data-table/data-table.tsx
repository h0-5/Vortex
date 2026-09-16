import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Table as TanStackTable,
} from '@tanstack/react-table';
import * as React from 'react';

import { cn } from '../../lib/cn.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table.js';

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  enableRowSelection?: boolean;
  className?: string;
  empty?: React.ReactNode;
  table?: TanStackTable<TData>;
}

export function DataTable<TData>({
  data,
  columns,
  className,
  empty,
  table: externalTable,
}: DataTableProps<TData>) {
  const internalTable = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const table = externalTable ?? internalTable;

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {empty ?? 'No results.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
