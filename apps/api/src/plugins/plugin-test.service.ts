import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ApiEnvironment, DiscordApiMessage, PluginScope } from '@vortex/shared';
import { toDiscordApiPayload } from '@vortex/shared';
import type { CoreMessage, PluginTemplate, PluginTestResult } from '@vortex/types';

import { API_ENVIRONMENT } from '../config/tokens.js';
import { PluginCoreRepository } from './plugin-core.repository.js';

@Injectable()
export class PluginTestService {
  constructor(
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
    private readonly pluginCoreRepository: PluginCoreRepository,
  ) {}

  async sendTemplate(
    scope: PluginScope,
    templateName: string,
    destination: { channelId?: string; userId?: string },
    variables: Record<string, string>,
  ): Promise<PluginTestResult> {
    const template = await this.pluginCoreRepository.getTemplate(scope, templateName);
    if (!template) {
      throw new NotFoundException(`Template "${templateName}" does not exist.`);
    }
    const message = resolveTemplate(template, variables);
    const payload = toDiscordApiPayload(message);

    if (destination.channelId) {
      const result = await this.sendToChannel(destination.channelId, payload);
      return { success: true, messageId: result.id, channelId: destination.channelId };
    }
    if (destination.userId) {
      const result = await this.sendToUser(destination.userId, payload);
      return { success: true, messageId: result.id, channelId: result.channel_id ?? destination.userId };
    }
    return { success: false, messageId: null, channelId: null };
  }

  private async sendToChannel(channelId: string, payload: DiscordApiMessage): Promise<{ id: string }> {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.environment.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Discord channel send failed: ${response.status} ${await response.text()}`);
    }
    return (await response.json()) as { id: string };
  }

  private async sendToUser(userId: string, payload: DiscordApiMessage): Promise<{ id: string; channel_id?: string }> {
    const channelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        Authorization: `Bot ${this.environment.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!channelResponse.ok) {
      throw new Error(`Discord DM channel creation failed: ${channelResponse.status}`);
    }
    const channel = (await channelResponse.json()) as { id: string };
    return this.sendToChannel(channel.id, payload);
  }
}

function resolveTemplate(template: PluginTemplate, variables: Record<string, string>): CoreMessage {
  const value = template.content as CoreMessage;
  return mapStrings(value, (text) =>
    text.replace(/\[([A-Za-z][A-Za-z0-9_]*)\]/gu, (match, name: string) => variables[name] ?? match),
  ) as CoreMessage;
}

function mapStrings(value: unknown, resolve: (text: string) => string): unknown {
  if (typeof value === 'string') return resolve(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, resolve));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, resolve)]));
  }
  return value;
}
