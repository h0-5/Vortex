import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@vortex/ui';
import { ArrowLeftIcon, ArrowRightIcon, BotIcon, PackageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '../components/error-state.js';
import { BotStatusBadge, PermissionBadge } from '../components/guild-badges.js';
import { GuildAvatar } from '../components/guild-avatar.js';
import { PageHeader } from '../components/page-header.js';
import { useGuildWorkspace } from '../hooks/use-guild-workspace.js';
import { getGuildPluginsPath, redirectToBotInvite } from '../lib/guild-actions.js';

export function GuildOverviewPage() {
  const navigate = useNavigate();
  const { guildId, guild } = useGuildWorkspace();

  if (guild.isLoading) {
    return <GuildOverviewSkeleton />;
  }
  if (guild.isError) {
    return <ErrorState message={(guild.error as Error).message} onRetry={() => void guild.refetch()} />;
  }
  if (!guild.data) {
    return <GuildOverviewSkeleton />;
  }

  const guildData = guild.data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Server workspace"
        title={guildData.name}
        description="Manage the connected Vortex foundation for this Discord server."
        actions={
          <Button variant="outline" onClick={() => navigate('/dashboard/select-server')}>
            <ArrowLeftIcon data-icon="inline-start" />
            Servers
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <GuildAvatar guild={guildData} className="size-14" />
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{guildData.name}</CardTitle>
              <CardDescription className="mt-1 truncate font-mono">{guildData.id}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionBadge role={guildData.permissionRole} />
            <BotStatusBadge botConnected={guildData.botConnected} />
          </div>
        </CardHeader>
      </Card>

      {guildData.botConnected ? (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="px-5 pb-3 pt-5 sm:px-6">
            <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <PackageIcon className="size-4" aria-hidden="true" />
            </div>
            <CardTitle>Plugin foundation</CardTitle>
            <CardDescription className="max-w-2xl leading-6">
              Review metadata-only plugins registered with Vortex and control their state for this
              server.
            </CardDescription>
          </CardHeader>
          <CardFooter className="border-t border-border bg-muted/20 px-5 py-4 sm:px-6">
            <Button onClick={() => navigate(getGuildPluginsPath(guildId))}>
              Open plugins
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden border-warning/30 py-0">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
                <BotIcon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">Connect the Vortex bot</p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Plugin controls remain unavailable until the bot joins this server.
                </p>
              </div>
            </div>
            <Button className="sm:shrink-0" onClick={() => redirectToBotInvite(guildId)}>
              Add bot
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GuildOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading server workspace">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}
