export function getUserAvatarUrl(discordId: string, avatar: string | null): string | undefined {
  if (!avatar) {
    return undefined;
  }
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=128`;
}

export function getGuildIconUrl(guildId: string, icon: string | null): string | undefined {
  if (!icon) {
    return undefined;
  }
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.webp?size=128`;
}

export function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
