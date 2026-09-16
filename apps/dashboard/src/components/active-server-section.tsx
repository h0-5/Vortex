import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
} from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, ServerIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { guildQuery } from '../hooks/queries.js';
import { getGuildDashboardPath, redirectToBotInvite } from '../lib/guild-actions.js';
import { ErrorState } from './error-state.js';
import { BotStatusBadge, PermissionBadge } from './guild-badges.js';
import { GuildAvatar } from './guild-avatar.js';

export function ActiveServerSection({ selectedGuildId }: { selectedGuildId: string | undefined }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Active server</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The server currently attached to your dashboard context.
        </p>
      </div>
      {selectedGuildId ? <SelectedServer guildId={selectedGuildId} /> : <NoSelectedServer />}
    </section>
  );
}

function SelectedServer({ guildId }: { guildId: string }) {
  const navigate = useNavigate();
  const guild = useQuery(guildQuery(guildId));

  if (guild.isLoading) {
    return <SelectedServerSkeleton />;
  }
  if (guild.isError) {
    return <ErrorState message={(guild.error as Error).message} onRetry={() => void guild.refetch()} />;
  }
  if (!guild.data) {
    return null;
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <GuildAvatar guild={guild.data} className="size-14" />
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{guild.data.name}</CardTitle>
            <CardDescription className="mt-1 truncate font-mono">
              Guild ID: {guild.data.id}
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionBadge role={guild.data.permissionRole} />
          <BotStatusBadge botConnected={guild.data.botConnected} />
        </div>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:px-6">
        <Button
          disabled={guild.data.action === null}
          onClick={() => {
            if (guild.data.action === null) return;
            if (guild.data.action === 'manage') void navigate(getGuildDashboardPath(guild.data.id));
            else redirectToBotInvite(guild.data.id);
          }}
        >
          {guild.data.action === 'manage' ? 'Manage server' : 'Add bot'}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <Button variant="outline" onClick={() => void navigate('/dashboard/select-server')}>
          Change server
        </Button>
      </CardFooter>
    </Card>
  );
}

function SelectedServerSkeleton() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-4 p-6">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </CardContent>
    </Card>
  );
}

function NoSelectedServer() {
  const navigate = useNavigate();

  return (
    <Empty className="min-h-64 border-solid bg-card">
      <EmptyHeader>
        <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ServerIcon className="size-5" aria-hidden="true" />
        </span>
        <EmptyTitle className="text-base">Choose your first server context</EmptyTitle>
        <EmptyDescription>
          Select a server you manage to make it the active Vortex workspace.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => navigate('/dashboard/select-server')}>
          Browse servers
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </EmptyContent>
    </Empty>
  );
}
