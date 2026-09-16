import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import Fuse from 'fuse.js';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  Skeleton,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vortex/ui';
import type { GuildPlugin, GuildPluginListResponse } from '@vortex/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CogIcon,
  EyeIcon,
  FileClockIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PackageIcon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ErrorState } from '../components/error-state.js';
import { PageHeader } from '../components/page-header.js';
import { PluginUploadDialog } from '../components/plugin-upload-dialog.js';
import { guildPluginsQuery } from '../hooks/queries.js';
import { useGuildWorkspace } from '../hooks/use-guild-workspace.js';
import { api } from '../lib/api-client.js';
import {
  getGuildDashboardPath,
  getGuildMonitoringLogsPath,
  getGuildPluginPath,
} from '../lib/guild-actions.js';

interface PluginMutation {
  pluginId: string;
  enabled: boolean;
}

type StatusFilter = 'all' | 'enabled' | 'disabled';

export function GuildPluginsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { guildId, guild } = useGuildWorkspace();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GuildPlugin | null>(null);
  const [deleteData, setDeleteData] = useState(false);

  const plugins = useQuery({
    ...guildPluginsQuery(guildId),
    enabled: guild.data?.botConnected === true,
  });

  const updatePlugin = useMutation({
    mutationFn: ({ pluginId, enabled }: PluginMutation) =>
      enabled
        ? api.enableGuildPlugin(guildId, pluginId)
        : api.disableGuildPlugin(guildId, pluginId),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['guilds', guildId, 'plugins'] });
      const previous = queryClient.getQueryData<GuildPluginListResponse>(['guilds', guildId, 'plugins']);
      queryClient.setQueryData<GuildPluginListResponse>(['guilds', guildId, 'plugins'], (current) =>
        current ? updatePluginInList(current, variables.pluginId, { enabled: variables.enabled }) : current,
      );
      return { previous };
    },
    onSuccess: async (plugin, variables) => {
      queryClient.setQueryData<GuildPluginListResponse>(['guilds', guildId, 'plugins'], (current) =>
        current ? updatePluginInList(current, variables.pluginId, plugin) : current,
      );
      await invalidateGuildPluginState(queryClient, guildId);
      toast.success(`Plugin ${variables.enabled ? 'enabled' : 'disabled'}.`);
    },
    onError: (error: Error, _variables, context) => {
      queryClient.setQueryData(['guilds', guildId, 'plugins'], context?.previous);
      toast.error(error.message || 'Failed to update plugin.');
    },
  });

  const deletePlugin = useMutation({
    mutationFn: ({ pluginId, deleteData }: { pluginId: string; deleteData: boolean }) =>
      api.deleteGuildPlugin(guildId, pluginId, deleteData),
    onMutate: async ({ pluginId }) => {
      await queryClient.cancelQueries({ queryKey: ['guilds', guildId, 'plugins'] });
      const previous = queryClient.getQueryData<GuildPluginListResponse>(['guilds', guildId, 'plugins']);
      queryClient.setQueryData<GuildPluginListResponse>(['guilds', guildId, 'plugins'], (current) =>
        current ? { data: current.data.filter((plugin) => plugin.id !== pluginId) } : current,
      );
      return { previous };
    },
    onSuccess: async () => {
      await invalidateGuildPluginState(queryClient, guildId);
      toast.success('Plugin deleted.');
      setDeleteTarget(null);
      setDeleteData(false);
    },
    onError: (error: Error, _variables, context) => {
      queryClient.setQueryData(['guilds', guildId, 'plugins'], context?.previous);
      toast.error(error.message || 'Failed to delete plugin.');
    },
  });

  const handleRefresh = useCallback(async () => {
    try {
      await queryClient.refetchQueries({ queryKey: ['guilds', guildId, 'plugins'] });
      toast.success('Plugin list refreshed.');
    } catch {
      toast.error('Failed to refresh plugin list.');
    }
  }, [queryClient, guildId]);

  if (guild.isLoading) {
    return <PluginPageSkeleton />;
  }
  if (guild.isError) {
    return <ErrorState message={(guild.error as Error).message} onRetry={() => void guild.refetch()} />;
  }
  if (!guild.data) {
    return <PluginPageSkeleton />;
  }

  const guildData = guild.data;
  if (!guildData.botConnected) {
    return (
      <ErrorState
        title="Bot connection required"
        message="Connect the Vortex bot before managing plugins for this server."
        onRetry={() => navigate(getGuildDashboardPath(guildId))}
      />
    );
  }

  const isRefreshing = plugins.isFetching && !plugins.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={guildData.name}
        title="Plugins"
        description="Manage installed extensions and upload new plugins for this server."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh plugin list"
            >
              <RefreshCwIcon className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <UploadIcon className="size-4" />
              Upload plugin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(getGuildDashboardPath(guildId))}
            >
              <ArrowLeftIcon className="size-4" />
              Server
            </Button>
          </div>
        }
      />

      {updatePlugin.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>Unable to update plugin</AlertTitle>
          <AlertDescription>{updatePlugin.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {plugins.isLoading ? <PluginTableSkeleton /> : null}
      {plugins.isError ? (
        <ErrorState message={(plugins.error as Error).message} onRetry={() => void plugins.refetch()} />
      ) : null}
      {plugins.isSuccess ? (
        <PluginManager
          plugins={plugins.data.data}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          pendingPluginId={updatePlugin.isPending ? updatePlugin.variables?.pluginId : null}
          onToggle={(pluginId, enabled) => updatePlugin.mutate({ pluginId, enabled })}
          onManage={(pluginId) => navigate(getGuildPluginPath(guildId, pluginId))}
          onLogs={(pluginId) =>
            navigate(`${getGuildMonitoringLogsPath(guildId)}?plugin=${encodeURIComponent(pluginId)}`)
          }
          onUpload={() => setUploadOpen(true)}
          onDelete={(plugin) => setDeleteTarget(plugin)}
        />
      ) : null}

      <PluginUploadDialog guildId={guildId} open={uploadOpen} onOpenChange={setUploadOpen} />

      <DeletePluginDialog
        plugin={deleteTarget}
        deleteData={deleteData}
        onDeleteDataChange={setDeleteData}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteData(false);
        }}
        onConfirm={() => {
          if (deleteTarget) {
            deletePlugin.mutate({ pluginId: deleteTarget.id, deleteData });
          }
        }}
        isPending={deletePlugin.isPending}
      />
    </div>
  );
}

interface PluginManagerProps {
  plugins: GuildPlugin[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  pendingPluginId: string | null;
  onToggle: (pluginId: string, enabled: boolean) => void;
  onManage: (pluginId: string) => void;
  onLogs: (pluginId: string) => void;
  onUpload: () => void;
  onDelete: (plugin: GuildPlugin) => void;
}

function PluginManager({
  plugins,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  pendingPluginId,
  onToggle,
  onManage,
  onLogs,
  onUpload,
  onDelete,
}: PluginManagerProps) {
  const filteredPlugins = useFilteredPlugins(plugins, search, statusFilter);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  const columns = useMemo<ColumnDef<GuildPlugin>[]>(
    () => [
      {
        id: 'icon',
        header: '',
        cell: () => (
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <PackageIcon className="size-4" aria-hidden="true" />
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
          </div>
        ),
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => <span className="text-sm">v{row.original.version}</span>,
      },
      {
        accessorKey: 'author',
        header: 'Author',
        cell: ({ row }) => <span className="text-sm">{row.original.author}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <PluginStatusBadge plugin={row.original} />,
      },
      {
        accessorKey: 'enabled',
        header: 'Enabled',
        cell: ({ row }) => <PluginEnabledState plugin={row.original} />,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <PluginActions
            plugin={row.original}
            pending={pendingPluginId === row.original.id}
            onToggle={() => onToggle(row.original.id, !row.original.enabled)}
            onManage={() => onManage(row.original.id)}
            onLogs={() => onLogs(row.original.id)}
            onDelete={() => onDelete(row.original)}
          />
        ),
        enableSorting: false,
      },
    ],
    [onToggle, onManage, onLogs, onDelete, pendingPluginId],
  );

  const table = useReactTable({
    data: filteredPlugins,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (plugins.length === 0) {
    return <NoPlugins onUpload={onUpload} />;
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search plugins..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredPlugins.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <SearchIcon className="size-5" />
          </span>
          <p className="font-medium">No plugins match</p>
          <p className="text-sm text-muted-foreground">Try adjusting the search or filters.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-testid={`plugin-row-${row.original.id}`}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-4 p-4 md:hidden">
            {filteredPlugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                pending={pendingPluginId === plugin.id}
                onToggle={() => onToggle(plugin.id, !plugin.enabled)}
                onManage={() => onManage(plugin.id)}
                onLogs={() => onLogs(plugin.id)}
                onDelete={() => onDelete(plugin)}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function useFilteredPlugins(
  plugins: GuildPlugin[],
  search: string,
  statusFilter: StatusFilter,
): GuildPlugin[] {
  return useMemo(() => {
    let result = plugins;

    if (statusFilter !== 'all') {
      result = result.filter((plugin) =>
        statusFilter === 'enabled' ? plugin.enabled : !plugin.enabled,
      );
    }

    if (search.trim()) {
      const fuse = new Fuse(result, {
        keys: ['name', 'id', 'description', 'author'],
        threshold: 0.4,
      });
      result = fuse.search(search).map((item) => item.item);
    }

    return result;
  }, [plugins, search, statusFilter]);
}

function PluginStatusBadge({ plugin }: { plugin: GuildPlugin }) {
  if (plugin.status === 'BROKEN' || plugin.status === 'ERROR') {
    return (
      <Badge variant="destructive">
        <AlertCircleIcon className="mr-1 size-3" />
        {plugin.status === 'BROKEN' ? 'Broken' : 'Error'}
      </Badge>
    );
  }
  return <Badge variant="secondary">Installed</Badge>;
}

interface PluginActionsProps {
  plugin: GuildPlugin;
  pending: boolean;
  onToggle: () => void;
  onManage: () => void;
  onLogs: () => void;
  onDelete: () => void;
}

function PluginActions({ plugin, pending, onToggle, onManage, onLogs, onDelete }: PluginActionsProps) {
  const hasDashboard = plugin.dashboard !== null;
  const isBroken = plugin.status === 'BROKEN' || plugin.status === 'ERROR';

  return (
    <div className="flex items-center justify-end gap-2">
      <PluginSwitch plugin={plugin} pending={pending} onToggle={onToggle} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" aria-label={`Actions for ${plugin.name}`}>
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasDashboard && !isBroken ? (
            <DropdownMenuItem disabled={!plugin.enabled} onClick={onManage} aria-label={`Manage ${plugin.name}`}>
              <CogIcon className="mr-2 size-4" />
              Manage
            </DropdownMenuItem>
          ) : null}
          {plugin.enabled && !hasDashboard ? (
            <DropdownMenuItem disabled>
              <EyeIcon className="mr-2 size-4" />
              No dashboard
            </DropdownMenuItem>
          ) : null}
          {isBroken ? (
            <DropdownMenuItem disabled>
              <AlertCircleIcon className="mr-2 size-4" />
              Needs repair
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={onLogs} aria-label={`View logs for ${plugin.name}`}>
            <FileClockIcon className="mr-2 size-4" />
            View logs
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <RefreshCwIcon className="mr-2 size-4" />
            Update
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
            aria-label={`Delete ${plugin.name}`}
          >
            <TrashIcon className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PluginCard({
  plugin,
  pending,
  onToggle,
  onManage,
  onLogs,
  onDelete,
}: {
  plugin: GuildPlugin;
  pending: boolean;
  onToggle: () => void;
  onManage: () => void;
  onLogs: () => void;
  onDelete: () => void;
}) {
  const hasDashboard = plugin.dashboard !== null;
  const isBroken = plugin.status === 'BROKEN' || plugin.status === 'ERROR';

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <PackageIcon className="size-4" />
          </span>
          <div>
            <p className="font-medium">{plugin.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{plugin.id}</p>
          </div>
        </div>
        <PluginStatusBadge plugin={plugin} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Version</p>
          <p>v{plugin.version}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Author</p>
          <p>{plugin.author}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <PluginEnabledState plugin={plugin} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Updated</p>
          <p>{new Date(plugin.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PluginSwitch plugin={plugin} pending={pending} onToggle={onToggle} />
        {hasDashboard && !isBroken ? (
          <Button size="sm" variant="outline" onClick={onManage} disabled={!plugin.enabled} aria-label={`Manage ${plugin.name}`}>
            Manage
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onLogs} aria-label={`View logs for ${plugin.name}`}>
          Logs
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          aria-label={`Delete ${plugin.name}`}
        >
          <TrashIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function PluginEnabledState({ plugin }: { plugin: GuildPlugin }) {
  return (
    <Badge variant={plugin.enabled ? 'success' : 'outline'}>
      {plugin.enabled ? 'Enabled' : 'Disabled'}
    </Badge>
  );
}

function PluginSwitch({ plugin, pending, onToggle }: { plugin: GuildPlugin; pending: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={`plugin-${plugin.id}-enabled`}
        checked={plugin.enabled}
        onCheckedChange={onToggle}
        disabled={pending}
        aria-label={plugin.enabled ? `Disable ${plugin.name}` : `Enable ${plugin.name}`}
      />
      {pending ? <Spinner aria-label="Updating plugin" /> : null}
    </div>
  );
}

function updatePluginInList(
  current: GuildPluginListResponse,
  pluginId: string,
  patch: Partial<GuildPlugin>,
): GuildPluginListResponse {
  return {
    data: current.data.map((plugin) => {
      if (plugin.id !== pluginId) return plugin;
      const enabled = patch.enabled ?? plugin.enabled;
      return {
        ...plugin,
        ...patch,
        enabled,
        guildStatus: enabled ? 'ENABLED' : 'DISABLED',
      };
    }),
  };
}

async function invalidateGuildPluginState(queryClient: ReturnType<typeof useQueryClient>, guildId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['guilds', guildId, 'plugins'] }),
    queryClient.invalidateQueries({ queryKey: ['guilds', guildId] }),
    queryClient.invalidateQueries({ queryKey: ['guilds'] }),
  ]);
}

function NoPlugins({ onUpload }: { onUpload: () => void }) {
  return (
    <Empty className="min-h-72 border-solid bg-card">
      <EmptyHeader>
        <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <PackageIcon className="size-5" aria-hidden="true" />
        </span>
        <EmptyTitle className="text-base">No plugins installed</EmptyTitle>
        <EmptyDescription>
          Upload a plugin package to extend this server with new features.
        </EmptyDescription>
      </EmptyHeader>
      <Button onClick={onUpload}>
        <UploadIcon className="mr-2 size-4" />
        Upload plugin
      </Button>
    </Empty>
  );
}

function PluginPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading plugin workspace">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <PluginTableSkeleton />
    </div>
  );
}

function PluginTableSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading plugins">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

interface DeletePluginDialogProps {
  plugin: GuildPlugin | null;
  deleteData: boolean;
  onDeleteDataChange: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function DeletePluginDialog({
  plugin,
  deleteData,
  onDeleteDataChange,
  onCancel,
  onConfirm,
  isPending,
}: DeletePluginDialogProps) {
  return (
    <Dialog open={plugin !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete plugin</DialogTitle>
          <DialogDescription>
            {plugin
              ? `Remove ${plugin.name} from this server. The plugin will be disabled first.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
            <Checkbox
              checked={deleteData}
              onCheckedChange={(checked) => onDeleteDataChange(checked === true)}
              className="mt-0.5"
              id="delete-plugin-data"
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="delete-plugin-data" className="cursor-pointer">
                Also delete plugin data
              </Label>
              <p className="text-xs text-muted-foreground">
                Removes logs, storage, and templates for this server. This cannot be undone.
              </p>
            </div>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete plugin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
