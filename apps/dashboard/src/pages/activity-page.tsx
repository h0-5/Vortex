import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery } from '@tanstack/react-query';
import { ActivityIcon, SearchIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ActivityEvent } from '@vortex/types';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableSkeleton,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vortex/ui';

import { ErrorState } from '../components/error-state.js';
import { PageHeader } from '../components/page-header.js';
import { formatDateTime } from '../lib/date.js';
import { api } from '../lib/api-client.js';

const actions = ['settings.updated', 'settings.asset_uploaded', 'plugin.enabled', 'plugin.disabled'] as const;
const resourceTypes = ['settings', 'plugin'] as const;

export function ActivityPage() {
  const { guildId } = useParams<{ guildId?: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<string>('all');
  const [resourceType, setResourceType] = useState<string>('all');

  const activity = useQuery({
    queryKey: ['activity', { page, search, action, resourceType, guildId }],
    queryFn: () =>
      api.getActivity({
        page,
        limit: 20,
        search: search || undefined,
        action: action === 'all' ? undefined : action,
        resourceType: resourceType === 'all' ? undefined : resourceType,
        guildId,
      }),
  });

  const events = activity.data?.data ?? [];
  const meta = activity.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  const columns = useMemo<ColumnDef<ActivityEvent>[]>(
    () => [
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
      },
      {
        accessorKey: 'resourceType',
        header: 'Resource',
        cell: ({ row }) => (
          <p className="truncate text-xs text-muted-foreground">{row.original.resourceType}</p>
        ),
      },
      {
        accessorKey: 'message',
        header: 'Message',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.original.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">By {row.original.actorName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader
            title="Time"
            sortDirection={column.getIsSorted()}
            onSort={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <time className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</time>
        ),
      },
    ],
    [],
  );

  if (activity.isLoading) return <DataTableSkeleton columns={4} rows={5} />;
  if (activity.isError) return <ErrorState message={activity.error.message} onRetry={() => void activity.refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={guildId ? `Guild ${guildId}` : 'Workspace'}
        title="Activity"
        description="Searchable audit trail for settings, plugins, and workspace events."
      />

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <CardTitle className="text-sm">Event history</CardTitle>
            <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_160px_160px] lg:w-[620px]">
              <div className="grid gap-2">
                <Label htmlFor="activity-search">Search</Label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="activity-search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                    placeholder="Search events"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Action</Label>
                <Select value={action} onValueChange={(value) => { setAction(value); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Resource</Label>
                <Select value={resourceType} onValueChange={(value) => { setResourceType(value); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All resources</SelectItem>
                    {resourceTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <Empty className="min-h-72 border-0">
              <EmptyHeader>
                <ActivityIcon className="size-8 text-muted-foreground" />
                <EmptyTitle>No activity found</EmptyTitle>
                <EmptyDescription>Try adjusting your filters, or come back after changes are made.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <VirtualizedDataTable data={events} columns={columns} />
          )}
          <div className="border-t border-border px-5 py-4">
            <DataTablePagination
              page={meta.page}
              pageSize={meta.limit}
              total={meta.total}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VirtualizedDataTable<TData>({
  data,
  columns,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="max-h-[60vh] overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-background [&_tr]:border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          className="relative [&_tr:last-child]:border-0"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const row = table.getRowModel().rows[virtualItem.index]!;
            return (
              <tr
                key={row.id}
                className="absolute left-0 right-0 border-b transition-colors hover:bg-muted/50"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                  height: `${virtualItem.size}px`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
