import type { PluginContext, PluginModule, PluginEventPayload } from '@vortex/core';

type TriggerType = 'equals' | 'startsWith' | 'endsWith' | 'contains';
type SendType = 'reply' | 'reply_mention' | 'send' | 'dm';

interface AutoResponderRule {
  id: string;
  triggers: string[];
  triggerType: TriggerType;
  sendType: SendType;
  messages: string[];
  giveRole: string;
  ignoredChannels: string[];
  ignoredRoles: string[];
  enabledChannels: string[];
  allowedRoles: string[];
  autoDeleteBotReply: boolean;
  deleteOnAuthorDelete: boolean;
  deleteUserMessage: boolean;
  enabled: boolean;
}

interface AutoResponderConfig {
  enabled: boolean;
  responses: AutoResponderRule[];
}

interface ReplyTrackingEntry {
  guildId: string;
  replyMessageId: string;
  channelId: string;
  deleteOnAuthorDelete: boolean;
  autoDeleteTimeout: ReturnType<typeof setTimeout> | null;
}

const STORAGE_KEY = 'auto_responder';
const COMMAND_PREFIX = '!';
const AUTO_DELETE_TIMEOUT_MS = 5000;
const MAX_MESSAGE_CONTENT = 2000;
const SLOT_PATTERN = /^rule_\d+$/u;

const EMPTY_CONFIG: AutoResponderConfig = {
  enabled: false,
  responses: [],
};

const TRIGGER_TYPES: readonly TriggerType[] = ['equals', 'startsWith', 'endsWith', 'contains'];
const SEND_TYPES: readonly SendType[] = ['reply', 'reply_mention', 'send', 'dm'];

const replyTracking = new Map<string, ReplyTrackingEntry>();

export default {
  async onInstall(context: PluginContext): Promise<void> {
    const existing = await context.storage.get<unknown>(STORAGE_KEY);
    if (existing === null || existing === undefined) {
      await context.storage.set(STORAGE_KEY, { ...EMPTY_CONFIG });
    }
    await context.logger.info('Auto responses plugin installed.');
  },

  async onEnable(context: PluginContext): Promise<void> {
    context.events.on('messageCreate', (payload: PluginEventPayload) => {
      void handleMessageCreate(context, payload);
    });
    context.events.on('messageDelete', (payload: PluginEventPayload) => {
      void handleMessageDelete(context, payload);
    });
    await context.logger.info('Auto responses plugin enabled.');
  },

  async onDisable(context: PluginContext): Promise<void> {
    for (const [sourceMessageId, entry] of [...replyTracking.entries()]) {
      if (entry.guildId !== context.guildId) {
        continue;
      }
      if (entry.autoDeleteTimeout) {
        clearTimeout(entry.autoDeleteTimeout);
      }
      replyTracking.delete(sourceMessageId);
    }
    await context.logger.info('Auto responses plugin disabled.');
  },
} satisfies PluginModule;

async function handleMessageCreate(
  context: PluginContext,
  payload: PluginEventPayload,
): Promise<void> {
  if (asBoolean(payload.userBot, false)) {
    return;
  }
  const content = asString(payload.content);
  if (!content.trim()) {
    return;
  }
  if (content.startsWith(COMMAND_PREFIX)) {
    return;
  }

  const authorId = asString(payload.authorId);
  const channelId = asString(payload.channelId);
  const messageId = asString(payload.messageId);
  if (!authorId || !channelId) {
    return;
  }

  const config = await readConfig(context);
  if (!config.enabled) {
    return;
  }

  const rules = config.responses;
  if (rules.length === 0) {
    return;
  }

  const memberRoleIds = asRoleIds(payload.memberRoleIds);

  for (const rule of rules) {
    if (rule.enabled === false) {
      continue;
    }
    if (rule.triggers.length === 0) {
      continue;
    }
    const matched = rule.triggers.some((trigger) =>
      matchesTrigger(content, trigger, rule.triggerType),
    );
    if (!matched) {
      continue;
    }

    if (rule.enabledChannels.length > 0 && !rule.enabledChannels.includes(channelId)) {
      continue;
    }
    if (rule.ignoredChannels.includes(channelId)) {
      continue;
    }
    if (
      rule.allowedRoles.length > 0 &&
      !rule.allowedRoles.some((roleId) => memberRoleIds.includes(roleId))
    ) {
      continue;
    }
    if (rule.ignoredRoles.some((roleId) => memberRoleIds.includes(roleId))) {
      continue;
    }

    const messages = rule.messages.filter((message) => message.length > 0);
    if (messages.length === 0) {
      continue;
    }
    const rawText = messages[Math.floor(Math.random() * messages.length)] ?? '';
    let text = resolveVariables(rawText, payload);
    if (!text.trim()) {
      continue;
    }

    if (rule.deleteUserMessage && messageId) {
      await tryDelete(context, channelId, messageId);
    }

    let replyMessageId: string | null = null;
    try {
      switch (rule.sendType) {
        case 'send': {
          const receipt = await context.messages.sendChannel(
            channelId,
            context.messages.build({ type: 'text', content: clampContent(text) }),
          );
          replyMessageId = receipt.id;
          break;
        }
        case 'reply_mention': {
          text = `${authorId ? `<@${authorId}> ` : ''}${text}`;
          const receipt = await context.messages.sendChannel(
            channelId,
            context.messages.build({ type: 'text', content: clampContent(text) }),
          );
          replyMessageId = receipt.id;
          break;
        }
        case 'dm': {
          if (!authorId) {
            break;
          }
          try {
            await context.messages.sendDirect(
              authorId,
              context.messages.build({ type: 'text', content: clampContent(text) }),
            );
          } catch {
            // DMs closed — silently ignore
          }
          break;
        }
        case 'reply':
        default: {
          const receipt = await context.messages.sendChannel(
            channelId,
            context.messages.build({ type: 'text', content: clampContent(text) }),
          );
          replyMessageId = receipt.id;
          break;
        }
      }
    } catch (error) {
      await context.logger.error('AutoResponder: failed to send reply.', {
        error: getErrorMessage(error),
      });
      continue;
    }

    if (rule.giveRole && authorId) {
      try {
        await context.guild.addRole(authorId, rule.giveRole);
      } catch {
        // Role may no longer exist — silently ignore
      }
    }

    if (replyMessageId && (rule.autoDeleteBotReply || rule.deleteOnAuthorDelete)) {
      const entry: ReplyTrackingEntry = {
        guildId: context.guildId,
        replyMessageId,
        channelId,
        deleteOnAuthorDelete: rule.deleteOnAuthorDelete,
        autoDeleteTimeout: null,
      };
      if (rule.autoDeleteBotReply) {
        const replyId = replyMessageId;
        entry.autoDeleteTimeout = setTimeout(() => {
          replyTracking.delete(messageId);
          void tryDelete(context, channelId, replyId);
        }, AUTO_DELETE_TIMEOUT_MS);
      }
      replyTracking.set(messageId, entry);
    }

    break;
  }
}

async function handleMessageDelete(
  context: PluginContext,
  payload: PluginEventPayload,
): Promise<void> {
  const sourceMessageId = asString(payload.messageId);
  if (!sourceMessageId) {
    return;
  }
  const entry = replyTracking.get(sourceMessageId);
  if (!entry || entry.guildId !== context.guildId) {
    return;
  }
  replyTracking.delete(sourceMessageId);
  if (entry.deleteOnAuthorDelete) {
    if (entry.autoDeleteTimeout) {
      clearTimeout(entry.autoDeleteTimeout);
    }
    await tryDelete(context, entry.channelId, entry.replyMessageId);
  }
}

async function readConfig(context: PluginContext): Promise<AutoResponderConfig> {
  const stored = await context.storage.get<unknown>(STORAGE_KEY);
  return normalizeConfig(stored);
}

function normalizeConfig(value: unknown): AutoResponderConfig {
  const config: AutoResponderConfig = { enabled: false, responses: [] };
  if (typeof value !== 'object' || value === null) {
    return config;
  }
  const record = value as Record<string, unknown>;
  config.enabled = asBoolean(record.enabled, false);

  const rules: AutoResponderRule[] = [];
  const seen = new Set<string>();
  const pushRule = (rule: AutoResponderRule): void => {
    if (seen.has(rule.id)) {
      return;
    }
    seen.add(rule.id);
    rules.push(rule);
  };

  for (const [key, raw] of Object.entries(record)) {
    if (!SLOT_PATTERN.test(key)) {
      continue;
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      continue;
    }
    pushRule(hydrateSlotRule(key, raw as Record<string, unknown>));
  }

  const responses = record['responses'];
  if (Array.isArray(responses)) {
    for (const raw of responses) {
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        continue;
      }
      pushRule(hydrateArrayRule(raw as Record<string, unknown>));
    }
  } else if (typeof responses === 'object' && responses !== null) {
    for (const raw of Object.values(responses as Record<string, unknown>)) {
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        continue;
      }
      pushRule(hydrateArrayRule(raw as Record<string, unknown>));
    }
  }

  config.responses = rules;
  return config;
}

function hydrateSlotRule(slotId: string, raw: Record<string, unknown>): AutoResponderRule {
  return {
    id: slotId,
    triggers: asStringList(raw['triggers']),
    triggerType: asEnum(raw['triggerType'], TRIGGER_TYPES, 'contains'),
    sendType: asEnum(raw['sendType'], SEND_TYPES, 'reply'),
    messages: asStringList(raw['messages'], true),
    giveRole: asString(raw['giveRole']),
    ignoredChannels: asStringList(raw['ignoredChannels']),
    ignoredRoles: asStringList(raw['ignoredRoles']),
    enabledChannels: asStringList(raw['enabledChannels']),
    allowedRoles: asStringList(raw['allowedRoles']),
    autoDeleteBotReply: asBoolean(raw['autoDeleteBotReply'], false),
    deleteOnAuthorDelete: asBoolean(raw['deleteOnAuthorDelete'], false),
    deleteUserMessage: asBoolean(raw['deleteUserMessage'], false),
    enabled: asBoolean(raw['enabled'], false),
  };
}

function hydrateArrayRule(raw: Record<string, unknown>): AutoResponderRule {
  const id = asString(raw['id']);
  return hydrateSlotRule(id || generateId(), raw);
}

function matchesTrigger(content: string, trigger: string, triggerType: TriggerType): boolean {
  const c = content.toLowerCase();
  const t = trigger.toLowerCase();
  switch (triggerType) {
    case 'equals':
      return c === t;
    case 'startsWith':
      return c.startsWith(t);
    case 'endsWith':
      return c.endsWith(t);
    case 'contains':
    default:
      return c.includes(t);
  }
}

function resolveVariables(text: string, payload: PluginEventPayload): string {
  const authorId = asString(payload.authorId);
  const replyAuthorId = asString(payload.replyToAuthorId);
  return text
    .replace(/\[user\]/g, `<@${authorId}>`)
    .replace(/\[userName\]/g, asString(payload.userName))
    .replace(/\[displayName\]/g, asString(payload.userDisplayName))
    .replace(/\[replyUser\]/g, replyAuthorId ? `<@${replyAuthorId}>` : '')
    .replace(/\[replyUsername\]/g, asString(payload.replyToAuthorName));
}

async function tryDelete(context: PluginContext, channelId: string, messageId: string): Promise<void> {
  try {
    await context.messages.delete(channelId, messageId);
  } catch {
    // Message may already be gone — silently ignore
  }
}

function asStringList(value: unknown, multiline = false): string[] {
  if (typeof value === 'string') {
    const segments = multiline
      ? value.split(/\r?\n/u)
      : value.split(/[\n,]+/u);
    return segments.map((segment) => segment.trim()).filter((segment) => segment.length > 0);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => asString(entry).trim()).filter((entry) => entry.length > 0);
  }
  return [];
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asRoleIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function clampContent(value: string): string {
  return value.slice(0, MAX_MESSAGE_CONTENT);
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}