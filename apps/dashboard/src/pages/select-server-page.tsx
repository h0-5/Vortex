import {
  Button,
  Card,
  CardContent,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
} from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, ServerIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ErrorState } from '../components/error-state.js';
import { PageHeader } from '../components/page-header.js';
import { ServerCard } from '../components/server-card.js';
import { guildsQuery } from '../hooks/queries.js';
import { getGuildDashboardPath, redirectToBotInvite } from '../lib/guild-actions.js';
import { useSelectedGuild } from '../state/selected-guild-context.js';

export function SelectServerPage() {
  const navigate = useNavigate();
  const guilds = useQuery(guildsQuery);
  const { selectedGuildId, selectGuild } = useSelectedGuild();

  const manageGuild = (guildId: string) => {
    selectGuild(guildId);
    void navigate(getGuildDashboardPath(guildId));
  };

  const addBot = (guildId: string) => {
    selectGuild(guildId);
    redirectToBotInvite(guildId);
  };

  const allGuilds = guilds.data?.data ?? [];
  const manageableGuilds = allGuilds.filter((guild) => guild.canManage);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Workspace"
        title="Servers"
        description="Choose a Discord server to make it the active management context."
        actions={
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeftIcon data-icon="inline-start" />
            Dashboard
          </Button>
        }
      />
      {guilds.isSuccess ? <ServerCollectionSummary guilds={manageableGuilds} /> : null}
      {guilds.isLoading ? <ServerGridSkeleton /> : null}
      {guilds.isError ? (
        <ErrorState message={(guilds.error as Error).message} onRetry={() => void guilds.refetch()} />
      ) : null}
      {guilds.isSuccess && manageableGuilds.length === 0 ? <NoServers /> : null}
      {guilds.isSuccess && manageableGuilds.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {manageableGuilds.map((guild) => (
            <ServerCard
              key={guild.id}
              guild={guild}
              isSelected={selectedGuildId === guild.id}
              onManage={manageGuild}
              onAddBot={addBot}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ServerCollectionSummary({ guilds }: { guilds: Array<{ botConnected: boolean }> }) {
  const connectedCount = guilds.filter((guild) => guild.botConnected).length;
  const missingCount = guilds.length - connectedCount;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-3 text-sm">
      <p>
        <span className="font-medium text-foreground">{guilds.length}</span>{' '}
        <span className="text-muted-foreground">manageable</span>
      </p>
      <p>
        <span className="font-medium text-foreground">{connectedCount}</span>{' '}
        <span className="text-muted-foreground">bot connected</span>
      </p>
      <p>
        <span className="font-medium text-foreground">{missingCount}</span>{' '}
        <span className="text-muted-foreground">awaiting bot</span>
      </p>
    </div>
  );
}

function NoServers() {
  return (
    <Empty className="min-h-72 border-solid bg-card">
      <EmptyHeader>
        <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ServerIcon className="size-5" aria-hidden="true" />
        </span>
        <EmptyTitle className="text-base">No manageable servers found</EmptyTitle>
        <EmptyDescription>
          Vortex only shows servers where you are the owner, an administrator, or a manager.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function ServerGridSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading servers"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="gap-0 py-0">
          <CardContent className="flex min-h-44 flex-col justify-between p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
