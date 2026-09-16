import { describe, expect, it, vi } from 'vitest';

import type { PluginCoreRepository } from './plugin-core.repository.js';
import { PluginTestService } from './plugin-test.service.js';

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

describe('PluginTestService', () => {
  it('sends a template to a channel', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ id: 'msg-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const repository = {
      getTemplate: vi.fn().mockResolvedValue({
        name: 'Default Template',
        type: 'default',
        contentMode: 'text',
        content: { type: 'text', content: 'Hello [userName]!' },
      }),
    } as unknown as PluginCoreRepository;

    const service = new PluginTestService(createEnvironment('bot-token'), repository);
    const result = await service.sendTemplate(
      { guildId: '1111111111111111111', pluginId: 'test-plugin' },
      'Default Template',
      { channelId: '2222222222222222222' },
      { userName: 'Alice' },
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/v10/channels/2222222222222222222/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'Hello Alice!' }),
      }),
    );
  });

  it('sends a template to a user DM', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => ({ id: 'dm-channel-1' }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => ({ id: 'msg-2' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const repository = {
      getTemplate: vi.fn().mockResolvedValue({
        name: 'DM Template',
        type: 'dm',
        contentMode: 'text',
        content: { type: 'text', content: 'Hello [userName]!' },
      }),
    } as unknown as PluginCoreRepository;

    const service = new PluginTestService(createEnvironment('bot-token'), repository);
    const result = await service.sendTemplate(
      { guildId: '1111111111111111111', pluginId: 'test-plugin' },
      'DM Template',
      { userId: '3333333333333333333' },
      { userName: 'Bob' },
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-2');
  });
});
