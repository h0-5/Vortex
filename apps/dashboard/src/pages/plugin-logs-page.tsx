import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardContent, CardHeader, CardTitle, DataTableSkeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@vortex/ui';
import type { PluginLog, PluginLogLevel } from '@vortex/types';
import { FileClockIcon, SearchIcon, XIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ErrorState } from '../components/error-state.js';
import { PageHeader } from '../components/page-header.js';
import { formatDateTime } from '../lib/date.js';
import { guildPluginLogsQuery, guildPluginsQuery } from '../hooks/queries.js';
import { useGuildWorkspace } from '../hooks/use-guild-workspace.js';

const levels: PluginLogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'AUDIT'];

export function PluginLogsPage() {
  const { guildId, guild } = useGuildWorkspace();
  const [searchParams] = useSearchParams();
  const initialPluginFilter = searchParams.get('plugin');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<PluginLogLevel | null>(null);
  const [pluginFilter, setPluginFilter] = useState<string | null>(initialPluginFilter);

  const logs = useQuery({
    ...guildPluginLogsQuery(guildId),
    enabled: guild.data?.botConnected === true,
  });
  const plugins = useQuery({
    ...guildPluginsQuery(guildId),
    enabled: guild.data?.botConnected === true,
  });

  const entries = useMemo(() => {
    let result = logs.data?.data ?? [];
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.message.toLowerCase().includes(lower) ||
          entry.pluginId.toLowerCase().includes(lower),
      );
    }
    if (levelFilter) {
      result = result.filter((entry) => entry.level === levelFilter);
    }
    if (pluginFilter) {
      result = result.filter((entry) => entry.pluginId === pluginFilter);
    }
    return result;
  }, [logs.data, search, levelFilter, pluginFilter]);

  const pluginList = plugins.data?.data ?? [];

  const columns = useMemo<ColumnDef<PluginLog>[]>(
    () => [
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => (
          <Badge variant={row.original.level === 'ERROR' ? 'destructive' : 'outline'}>
            {row.original.level}
          </Badge>
        ),
      },
      {
        accessorKey: 'pluginId',
        header: 'Plugin',
        cell: ({ row }) => (
          <p className="font-mono text-xs text-muted-foreground">{row.original.pluginId}</p>
        ),
      },
      {
        accessorKey: 'message',
        header: 'Message',
        cell: ({ row }) => <p className="text-sm text-foreground">{row.original.message}</p>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Time',
        cell: ({ row }) => (
          <time className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</time>
        ),
      },
    ],
    [],
  );

  if (guild.isLoading || logs.isLoading) {
    return <DataTableSkeleton columns={4} rows={5} />;
  }
  if (guild.isError) {
    return <ErrorState message={(guild.error as Error).message} onRetry={() => void guild.refetch()} />;
  }
  if (logs.isError) {
    return <ErrorState message={logs.error.message} onRetry={() => void logs.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={guild.data?.name ?? 'Plugin runtime'}
        title="Plugin logs"
        description="Guild-isolated runtime, command, lifecycle, and audit records from installed modules."
      />

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm">Activity log</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
                <SearchIcon className="size-3 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search logs"
                  className="h-8 w-32 bg-transparent text-sm outline-none lg:w-48"
                />
                {search ? (
                  <button onClick={() => setSearch('')} className="text-muted-foreground">
                    <XIcon className="size-3" />
                  </button>
                ) : null}
              </label>
              <Select
                value={levelFilter ?? ''}
                onValueChange={(value) => setLevelFilter((value as PluginLogLevel) || null)}
              >
                <SelectTrigger className="h-8 w-auto">
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={pluginFilter ?? ''}
                onValueChange={(value) => setPluginFilter(value || null)}
              >
                <SelectTrigger className="h-8 w-auto">
                  <SelectValue placeholder="All plugins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All plugins</SelectItem>
                  {pluginList.map((plugin) => (
                    <SelectItem key={plugin.id} value={plugin.id}>
                      {plugin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {entries.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileClockIcon className="size-5" />
              </span>
              <p className="font-medium">No matching log entries</p>
              <p className="text-sm text-muted-foreground">
                {logs.data?.data.length
                  ? 'Try adjusting the filters above.'
                  : 'Lifecycle changes, command executions, and audits will appear here.'}
              </p>
            </div>
          ) : (
            <VirtualizedDataTable data={entries} columns={columns} />
          )}
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
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="max-h-[60vh] overflow-auto">
      <table className="w-full caption-bottom text-sm">
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
