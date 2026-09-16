export function getGuildDashboardPath(guildId: string): string {
  return `/dashboard/${encodeURIComponent(guildId)}`;
}

export function getGuildPluginsPath(guildId: string): string {
  return `${getGuildDashboardPath(guildId)}/plugins`;
}

export function getGuildPluginPath(guildId: string, pluginId: string): string {
  return `${getGuildPluginsPath(guildId)}/${encodeURIComponent(pluginId)}`;
}

export function getGuildMonitoringLogsPath(guildId: string): string {
  return `${getGuildDashboardPath(guildId)}/monitoring/logs`;
}

export function getGuildPluginLogsPath(guildId: string): string {
  return getGuildMonitoringLogsPath(guildId);
}

export function getGuildCoreApisPath(guildId: string): string {
  return `${getGuildDashboardPath(guildId)}/developer/core-apis`;
}

export function getSettingsPath(section = 'general'): string {
  return `/dashboard/settings/${encodeURIComponent(section)}`;
}

export function getBotInvitePath(guildId: string): string {
  return `/api/v1/guilds/${encodeURIComponent(guildId)}/bot-invite`;
}

export function redirectToBotInvite(guildId: string): void {
  window.location.assign(getBotInvitePath(guildId));
}
