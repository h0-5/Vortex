import { Avatar, AvatarFallback, AvatarImage } from '@vortex/ui';
import type { GuildSummary } from '@vortex/types';

import { getGuildIconUrl, getInitials } from '../lib/discord-images.js';

export function GuildAvatar({
  guild,
  className,
}: {
  guild: Pick<GuildSummary, 'id' | 'name' | 'icon'>;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={getGuildIconUrl(guild.id, guild.icon)} alt="" />
      <AvatarFallback>{getInitials(guild.name)}</AvatarFallback>
    </Avatar>
  );
}
