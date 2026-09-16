import type { ApiEnvironment } from '@vortex/shared';
import { describe, expect, it } from 'vitest';

import { DiscordBotInviteService } from './discord-bot-invite.service.js';

const environment: ApiEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://localhost/vortex',
  LOG_LEVEL: 'info',
  API_PORT: 4000,
  SESSION_SECRET: 'test-session-secret-with-at-least-32-characters',
  OAUTH_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-secret',
  DISCORD_BOT_TOKEN: 'test-bot-token',
  DISCORD_REDIRECT_URI: 'http://localhost:4000/api/v1/auth/discord/callback',
  DASHBOARD_URL: 'http://localhost:5173',
};

describe('DiscordBotInviteService', () => {
  it('creates a least-privilege invite locked to the selected guild', () => {
    const service = new DiscordBotInviteService(environment);
    const invite = new URL(service.createInviteUrl('987654321098765432'));

    expect(`${invite.origin}${invite.pathname}`).toBe('https://discord.com/oauth2/authorize');
    expect(invite.searchParams.get('client_id')).toBe(environment.DISCORD_CLIENT_ID);
    expect(invite.searchParams.get('scope')?.split(' ').sort()).toEqual([
      'applications.commands',
      'bot',
    ]);
    expect(invite.searchParams.get('permissions')).toBe('268815361');
    expect(invite.searchParams.get('guild_id')).toBe('987654321098765432');
    expect(invite.searchParams.get('disable_guild_select')).toBe('true');
    expect(invite.searchParams.get('integration_type')).toBe('0');
  });
});
