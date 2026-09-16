import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useSelectedGuild } from '../state/selected-guild-context.js';
import { guildQuery } from './queries.js';

export function useGuildWorkspace() {
  const { guildId } = useParams<{ guildId: string }>();
  const { selectGuild } = useSelectedGuild();
  const requestedGuildId = guildId ?? '';
  const hasValidGuildId = /^\d{17,20}$/.test(requestedGuildId);
  const guild = useQuery({
    ...guildQuery(requestedGuildId),
    enabled: hasValidGuildId,
  });

  useEffect(() => {
    if (guild.isSuccess && hasValidGuildId) {
      selectGuild(requestedGuildId);
    }
  }, [guild.isSuccess, hasValidGuildId, requestedGuildId, selectGuild]);

  if (!hasValidGuildId) {
    throw new Error('A valid guild ID is required for this page.');
  }

  return { guildId: requestedGuildId, guild };
}
