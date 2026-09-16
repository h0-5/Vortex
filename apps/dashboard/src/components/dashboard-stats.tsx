import type { GuildListResponse } from '@vortex/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { BotIcon, CircleCheckIcon, ServerIcon, ShieldCheckIcon } from 'lucide-react';

import { ErrorState } from './error-state.js';
import { StatCard, StatCardSkeleton } from './stat-card.js';

export function DashboardStats({ guilds }: { guilds: UseQueryResult<GuildListResponse, unknown> }) {
  if (guilds.isLoading) {
    return <DashboardStatsSkeleton />;
  }

  if (guilds.isError) {
    return (
      <ErrorState
        title="Unable to load server summary"
        message={(guilds.error as Error).message}
        onRetry={() => void guilds.refetch()}
      />
    );
  }

  const servers = guilds.data?.data ?? [];
  const managedServers = servers.filter((guild) => guild.canManage).length;
  const connectedServers = servers.filter((guild) => guild.botConnected).length;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Server summary">
      <StatCard
        label="Total servers"
        value={String(servers.length)}
        description="Eligible management workspaces"
        icon={ServerIcon}
      />
      <StatCard
        label="Managed servers"
        value={String(managedServers)}
        description="Owner, administrator, or manager"
        icon={ShieldCheckIcon}
      />
      <StatCard
        label="Bot connected"
        value={String(connectedServers)}
        description="Servers currently running Vortex"
        icon={BotIcon}
      />
      <StatCard
        label="Account status"
        value="Active"
        description="Discord authentication verified"
        icon={CircleCheckIcon}
      />
    </section>
  );
}

function DashboardStatsSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Server summary">
      {Array.from({ length: 4 }, (_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </section>
  );
}
