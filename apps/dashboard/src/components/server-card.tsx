import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, cn } from '@vortex/ui';
import type { GuildSummary } from '@vortex/types';
import { ArrowRightIcon, BotIcon, CheckIcon } from 'lucide-react';

import { BotStatusBadge, PermissionBadge } from './guild-badges.js';
import { GuildAvatar } from './guild-avatar.js';

export function ServerCard({
  guild,
  isSelected,
  onManage,
  onAddBot,
}: {
  guild: GuildSummary;
  isSelected: boolean;
  onManage: (guildId: string) => void;
  onAddBot: (guildId: string) => void;
}) {
  const isManageAction = guild.action === 'manage';
  const canAct = guild.action !== null;

  return (
    <Card
      className={cn(
        'gap-0 overflow-hidden py-0 transition-colors hover:border-input',
        isSelected && 'border-primary/50',
      )}
    >
      <CardHeader className="flex flex-row items-start gap-3 px-5 pb-4 pt-5">
        <GuildAvatar guild={guild} className="size-11" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm">{guild.name}</CardTitle>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{guild.id}</p>
        </div>
        {isSelected ? (
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Selected server"
          >
            <CheckIcon className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 px-5 pb-5">
        <PermissionBadge role={guild.permissionRole} />
        <BotStatusBadge botConnected={guild.botConnected} />
      </CardContent>
      <CardFooter className="border-t border-border bg-muted/20 px-5 py-3">
        <Button
          size="sm"
          variant={isManageAction && isSelected ? 'secondary' : 'default'}
          className="w-full"
          disabled={!canAct}
          onClick={() => {
            if (!canAct) return;
            if (isManageAction) onManage(guild.id);
            else onAddBot(guild.id);
          }}
        >
          {isManageAction ? (isSelected ? 'Open dashboard' : 'Manage') : 'Add bot'}
          {isManageAction ? (
            <ArrowRightIcon data-icon="inline-end" />
          ) : (
            <BotIcon data-icon="inline-end" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
