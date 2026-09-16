import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuildEmojiService } from './guild-emoji.service.js';

const environment = {
  NODE_ENV: 'test' as const,
  DATABASE_URL: 'postgresql://localhost/vortex',
  LOG_LEVEL: 'info' as const,
  API_PORT: 4000,
  SESSION_SECRET: 'a'.repeat(32),
  OAUTH_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
  DISCORD_CLIENT_ID: '12345678901234567',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_BOT_TOKEN: 'token',
  DISCORD_REDIRECT_URI: 'http://localhost:4000/callback',
  DASHBOARD_URL: 'http://localhost:5173',
};

describe('GuildEmojiService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps mocked Discord server emojis without a live API call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([{ id: '22345678901234567', name: 'vortex', animated: false }]),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(new GuildEmojiService(environment).list('12345678901234567')).resolves.toEqual([
      {
        id: '22345678901234567',
        name: 'vortex',
        animated: false,
        imageUrl: 'https://cdn.discordapp.com/emojis/22345678901234567.png',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/v10/guilds/12345678901234567/emojis',
      expect.objectContaining({
        headers: { Authorization: 'Bot token' },
      }),
    );
  });
});
