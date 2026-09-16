import type { PluginContext, PluginModule, PluginEventPayload } from '@vortex/core';
import type { CoreMessage, PluginTemplate } from '@vortex/types';

interface WelcomeSettings {
  enabled: boolean;
  channelId: string | null;
  messageType: 'text' | 'embed';
  templateId: string;
}

interface LeaveSettings {
  enabled: boolean;
  channelId: string | null;
  messageType: 'text' | 'embed';
  templateId: string;
}

interface DmSettings {
  enabled: boolean;
  templateId: string;
}

interface WelcomeConfig {
  welcome: WelcomeSettings;
  leave: LeaveSettings;
  dm: DmSettings;
}

const DEFAULT_CONFIG: WelcomeConfig = {
  welcome: {
    enabled: false,
    channelId: null,
    messageType: 'text',
    templateId: 'Default Welcome',
  },
  leave: {
    enabled: false,
    channelId: null,
    messageType: 'text',
    templateId: 'Default Leave',
  },
  dm: {
    enabled: false,
    templateId: 'Default Welcome',
  },
};

const DEFAULT_WELCOME_TEMPLATE = {
  type: 'text',
  content:
    'Welcome [user] to [serverName]! We\'re now at [memberCount] members. Enjoy your stay!',
} as const;

const DEFAULT_LEAVE_TEMPLATE = {
  type: 'text',
  content: '[user] left the server. We\'re now at [memberCount] members.',
} as const;

export default {
  async onInstall(context: PluginContext): Promise<void> {
    const existing = await context.storage.get<WelcomeConfig>('settings');
    if (!existing) {
      await context.storage.set('settings', DEFAULT_CONFIG);
    }
    const templates = await context.templates.list();
    if (!templates.some((template) => template.name === 'Default Welcome')) {
      await context.templates.save({
        name: 'Default Welcome',
        type: 'welcome',
        contentMode: 'text',
        content: DEFAULT_WELCOME_TEMPLATE.content,
        variables: ['user', 'userName', 'userCreatedDate', 'userCreatedDays', 'serverName', 'memberCount'],
        previewData: {
          user: '@Mira',
          userName: 'Mira',
          serverName: 'Vortex Labs',
          memberCount: '158',
        },
      });
    }
    if (!templates.some((template) => template.name === 'Default Leave')) {
      await context.templates.save({
        name: 'Default Leave',
        type: 'leave',
        contentMode: 'text',
        content: DEFAULT_LEAVE_TEMPLATE.content,
        variables: ['user', 'userName', 'serverName', 'memberCount'],
        previewData: {
          user: '@Mira',
          userName: 'Mira',
          serverName: 'Vortex Labs',
          memberCount: '158',
        },
      });
    }
    context.logger.info('Welcome plugin installed with default settings.');
  },

  async onEnable(context: PluginContext): Promise<void> {
    const storage = await context.storage.get<WelcomeConfig>('settings');

    context.events.on('guildMemberAdd', async (payload) => {
      const config = { ...DEFAULT_CONFIG, ...(storage ?? {}) };
      const variables: Record<string, string> = {
        user: asMention(asString(payload.userId)),
        userName: asString(payload.userName),
        userDisplayName: asString(payload.userDisplayName),
        userAvatar: asString(payload.userAvatar),
        userCreatedDate: formatDate(asString(payload.userCreatedAt)),
        serverName: asString(payload.serverName),
        memberCount: asString(payload.memberCount),
      };

      if (config.welcome.enabled) {
        const template = await getTemplate(context, config.welcome.templateId, 'Default Welcome');
        const message = buildMessage(context, template, variables, config.welcome.messageType);
        if (message && config.welcome.channelId) {
          try {
            await context.messages.sendChannel(config.welcome.channelId, message);
            await context.logger.audit('Welcome message sent.', {
              userId: payload.userId,
              channelId: config.welcome.channelId,
            });
          } catch (error) {
            await context.logger.error('Failed to send welcome message.', {
              error: getErrorMessage(error),
            });
          }
        }
      }

      if (config.dm.enabled) {
        const template = await getTemplate(context, config.dm.templateId, 'Default Welcome');
        const message = buildMessage(context, template, variables, 'text');
        const userId = asString(payload.userId);
        if (message && userId) {
          try {
            await context.messages.sendDirect(userId, message);
            await context.logger.audit('Welcome DM sent.', {
              userId,
            });
          } catch (error) {
            await context.logger.warn('Could not send welcome DM.', {
              userId,
              error: getErrorMessage(error),
            });
          }
        }
      }
    });

    context.events.on('guildMemberRemove', async (payload) => {
      const config = { ...DEFAULT_CONFIG, ...(storage ?? {}) };
      if (!config.leave.enabled) {
        return;
      }
      const variables: Record<string, string> = {
        user: asString(payload.userName),
        userName: asString(payload.userName),
        userDisplayName: asString(payload.userDisplayName),
        serverName: asString(payload.serverName),
        memberCount: asString(payload.memberCount),
      };
      const template = await getTemplate(context, config.leave.templateId, 'Default Leave');
      const message = buildMessage(context, template, variables, config.leave.messageType);
      if (message && config.leave.channelId) {
        try {
          await context.messages.sendChannel(config.leave.channelId, message);
          await context.logger.audit('Leave message sent.', {
            userId: payload.userId,
            channelId: config.leave.channelId,
          });
        } catch (error) {
          await context.logger.error('Failed to send leave message.', {
            error: getErrorMessage(error),
          });
        }
      }
    });

    context.logger.info('Welcome plugin enabled.');
  },
} satisfies PluginModule;

async function getTemplate(
  context: PluginContext,
  requestedName: string,
  fallbackName: string,
): Promise<PluginTemplate | null> {
  const name = requestedName || fallbackName;
  return (await context.templates.get(name)) ?? (await context.templates.get(fallbackName));
}

function buildMessage(
  context: PluginContext,
  template: PluginTemplate | null,
  variables: Record<string, string>,
  messageType: 'text' | 'embed',
): CoreMessage | null {
  if (template && template.contentMode === 'text') {
    const content = context.variables.resolve(String(template.content), variables);
    if (messageType === 'embed') {
      const resolved = context.embeds.build({
        title: 'Welcome',
        description: content,
      });
      return resolved;
    }
    return context.messages.build({ type: 'text', content });
  }

  if (template && template.contentMode === 'embed' && typeof template.content === 'object') {
    const raw = template.content as Record<string, unknown>;
    const embedded: Record<string, unknown> = { ...raw };
    if (typeof raw.description === 'string') {
      embedded.description = context.variables.resolve(raw.description, variables);
    }
    const resolved = context.embeds.build(embedded);
    return resolved;
  }

  if (template && template.contentMode === 'components_v2') {
    return template.content as CoreMessage;
  }

  const content = context.variables.resolve(
    typeof template?.content === 'string' ? template.content : '',
    variables,
  );
  return context.messages.build({ type: 'text', content });
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asMention(userId: string): string {
  return userId ? `<@${userId}>` : '';
}