import { useQuery } from '@tanstack/react-query';

import { AccountHero } from '../components/account-hero.js';
import { ActiveServerSection } from '../components/active-server-section.js';
import { DashboardStats } from '../components/dashboard-stats.js';
import { PageHeader } from '../components/page-header.js';
import { RecentActivity } from '../components/recent-activity.js';
import { currentUserQuery, guildsQuery } from '../hooks/queries.js';
import { useSelectedGuild } from '../state/selected-guild-context.js';

export function DashboardPage() {
  const { data: user } = useQuery(currentUserQuery);
  const guilds = useQuery(guildsQuery);
  const { selectedGuildId } = useSelectedGuild();

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Monitor your Discord workspace and keep the active server context close at hand."
      />
      <AccountHero user={user} />
      <DashboardStats guilds={guilds} />
      <ActiveServerSection selectedGuildId={selectedGuildId} />
      <RecentActivity />
    </div>
  );
}
