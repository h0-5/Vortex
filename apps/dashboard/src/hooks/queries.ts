import { queryOptions } from '@tanstack/react-query';

import { api, ApiError } from '../lib/api-client.js';

const safeRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return false;
    }
    if (error.status >= 500) {
      return failureCount < 1;
    }
  }
  return failureCount < 2;
};

export const currentUserQuery = queryOptions({
  queryKey: ['current-user'],
  queryFn: api.getCurrentUser,
  retry: false,
  staleTime: 60_000,
});

export const botProfileQuery = queryOptions({
  queryKey: ['bot-profile'],
  queryFn: api.getBotProfile,
  staleTime: 300_000,
});

export const guildsQuery = queryOptions({
  queryKey: ['guilds'],
  queryFn: api.getGuilds,
  refetchOnWindowFocus: false,
  retry: safeRetry,
  staleTime: 30_000,
});

export function guildQuery(guildId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId],
    queryFn: () => api.getGuild(guildId),
    refetchOnWindowFocus: false,
    retry: safeRetry,
    staleTime: 30_000,
  });
}

export function guildPluginsQuery(guildId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'plugins'],
    queryFn: () => api.getGuildPlugins(guildId),
    refetchOnWindowFocus: false,
    retry: safeRetry,
    staleTime: 15_000,
  });
}

export function guildPluginQuery(guildId: string, pluginId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'plugins', pluginId],
    queryFn: () => api.getGuildPlugin(guildId, pluginId),
    refetchOnWindowFocus: false,
    retry: safeRetry,
    staleTime: 15_000,
  });
}

export function guildPluginLogsQuery(guildId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'plugins', 'logs'],
    queryFn: () => api.getGuildPluginActivity(guildId),
    staleTime: 10_000,
  });
}

export function guildEmojisQuery(guildId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'emojis'],
    queryFn: () => api.getGuildEmojis(guildId),
    staleTime: 60_000,
  });
}

export function guildChannelsQuery(guildId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'channels'],
    queryFn: () => api.getGuildChannels(guildId),
    staleTime: 60_000,
  });
}

export function guildCategoriesQuery(guildId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'categories'],
    queryFn: () => api.getGuildCategories(guildId),
    staleTime: 60_000,
  });
}

export function guildRolesQuery(guildId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'roles'],
    queryFn: () => api.getGuildRoles(guildId),
    staleTime: 60_000,
  });
}

export function guildPluginStorageQuery(guildId: string, pluginId: string, key: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'plugins', pluginId, 'storage', key],
    queryFn: () => api.getGuildPluginStorage(guildId, pluginId, key),
    staleTime: 10_000,
  });
}

export function guildPluginTemplatesQuery(guildId: string, pluginId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'plugins', pluginId, 'templates'],
    queryFn: () => api.getGuildPluginTemplates(guildId, pluginId),
    staleTime: 15_000,
  });
}

export function guildPluginCommandsQuery(guildId: string, pluginId: string) {
  return queryOptions({
    queryKey: ['guilds', guildId, 'plugins', pluginId, 'commands'],
    queryFn: () => api.getGuildPluginCommands(guildId, pluginId),
    staleTime: 15_000,
  });
}
