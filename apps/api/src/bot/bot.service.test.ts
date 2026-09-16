import { describe, expect, it, vi } from 'vitest';

import { BotService } from './bot.service.js';

function createEnvironment(token: string) {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost',
    LOG_LEVEL: 'info',
    API_PORT: 4000,
    SESSION_SECRET: 'session-secret-at-least-32-characters-long',
    OAUTH_TOKEN_ENCRYPTION_KEY: Buffer.from('a'.repeat(32)).toString('base64'),
    DISCORD_CLIENT_ID: '1234567890123456789',
    DISCORD_CLIENT_SECRET: 'secret',
    DISCORD_BOT_TOKEN: token,
    DISCORD_REDIRECT_URI: 'http://localhost',
    DASHBOARD_URL: 'http://localhost',
  } as const;
}

describe('BotService', () => {
  it('returns bot profile from Discord API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ id: '1234567890123456789', username: 'TestBot', avatar: 'avatarhash', discriminator: '0' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new BotService(createEnvironment('bot-token'));
    const profile = await service.getProfile();

    expect(profile.id).toBe('1234567890123456789');
    expect(profile.username).toBe('TestBot');
    expect(profile.avatarUrl).toBe('https://cdn.discordapp.com/avatars/1234567890123456789/avatarhash.png');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/v10/users/@me',
      expect.objectContaining({ headers: { Authorization: 'Bot bot-token' } }),
    );
  });

  it('returns null avatar when bot has no avatar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ id: '1234567890123456789', username: 'TestBot', avatar: null, discriminator: '0' }),
    }));

    const service = new BotService(createEnvironment('bot-token'));
    const profile = await service.getProfile();

    expect(profile.avatarUrl).toBeNull();
  });
});
