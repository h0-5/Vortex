import { Badge, Card, CardContent } from '@vortex/ui';
import type { User } from '@vortex/types';

import { UserAvatar } from './user-avatar.js';

export function AccountHero({ user }: { user: User }) {
  const displayName = user.globalName ?? user.username;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative">
            <UserAvatar user={user} className="size-14 sm:size-16" />
            <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                Welcome back, {displayName}
              </h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage your Discord infrastructure from a single control center.
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-1 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="text-xs text-muted-foreground">Discord account</p>
          <p className="text-xs text-muted-foreground">Member since</p>
          <p className="truncate font-mono text-xs font-medium">{user.discordId}</p>
          <p className="text-xs font-medium">{formatMemberSince(user.createdAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMemberSince(createdAt: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(createdAt));
}
