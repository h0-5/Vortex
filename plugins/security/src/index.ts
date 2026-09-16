import type {
  PluginAuditEventType,
  PluginContext,
  PluginEventPayload,
  PluginGuild,
  PluginModule,
  PluginMemberRecord,
} from '@vortex/core';
import type { CoreMessage } from '@vortex/types';

interface AntiLimitFeature {
  enabled: boolean;
  action: string;
  limit: number;
}

interface AntiActionFeature {
  enabled: boolean;
  action: string;
}

interface SecuritySettings {
  security: {
    channelId: string | null;
  };
  protection: {
    enable: boolean;
    whitelist_roles: string;
    user_permissions: string;
    actions: {
      mute_role: string | null;
      jail_role: string | null;
    };
    anti_ban: AntiLimitFeature;
    anti_kick: AntiLimitFeature;
    anti_channel_create: AntiLimitFeature;
    anti_channel_delete: AntiLimitFeature;
    anti_role_create: AntiLimitFeature;
    anti_role_delete: AntiLimitFeature;
    anti_role_add: AntiLimitFeature;
    anti_bots: AntiActionFeature;
    anti_webhooks: AntiActionFeature;
  };
}

const DEFAULTS: SecuritySettings = {
  security: {
    channelId: null,
  },
  protection: {
    enable: true,
    whitelist_roles: '',
    user_permissions: '',
    actions: {
      mute_role: null,
      jail_role: null,
    },
    anti_ban: { enabled: true, action: '1', limit: 3 },
    anti_kick: { enabled: true, action: '1', limit: 3 },
    anti_channel_create: { enabled: true, action: '1', limit: 5 },
    anti_channel_delete: { enabled: true, action: '1', limit: 3 },
    anti_role_create: { enabled: true, action: '1', limit: 5 },
    anti_role_delete: { enabled: true, action: '1', limit: 3 },
    anti_role_add: { enabled: true, action: '1', limit: 3 },
    anti_bots: { enabled: true, action: '1' },
    anti_webhooks: { enabled: true, action: '1' },
  },
};

const AUDIT_WAIT_MS = 800;
const AUDIT_WINDOW_MS = 5000;
const TRACK_WINDOW_MS = 10_000;

const COLORS = {
  danger: 0xef4444,
  info: 0x3b82f6,
} as const;

let settings: SecuritySettings = DEFAULTS;
let cleanups: Array<() => void> = [];
let pluginCtx: PluginContext | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
const trackers = new Map<string, number[]>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trackAction(guildId: string, userId: string, eventName: string, limit: number): number {
  const key = `${guildId}-${userId}-${eventName}`;
  const now = Date.now();
  let stamps = trackers.get(key) ?? [];
  stamps = stamps.filter((t) => now - t <= TRACK_WINDOW_MS);
  stamps.push(now);
  trackers.set(key, stamps);
  if (stamps.length > limit) {
    trackers.delete(key);
  }
  return stamps.length;
}

function cleanExpired(): void {
  const now = Date.now();
  for (const [key, stamps] of trackers) {
    if (stamps.length === 0 || now - stamps[stamps.length - 1]! > TRACK_WINDOW_MS) {
      trackers.delete(key);
    }
  }
}

function isWhitelisted(userId: string, roles: string[] | undefined, botId: string | null): boolean {
  if (userId === botId) {
    return true;
  }
  const whitelist = splitLines(settings.protection.whitelist_roles);
  if (whitelist.length === 0 || !roles || roles.length === 0) {
    return false;
  }
  return whitelist.some((roleId) => roles.includes(roleId));
}

async function withinAuditWindow(audit: { createdAt: string | null }): Promise<boolean> {
  if (!audit.createdAt) {
    return false;
  }
  const createdAt = Date.parse(audit.createdAt);
  if (Number.isNaN(createdAt)) {
    return false;
  }
  return Date.now() - createdAt <= AUDIT_WINDOW_MS;
}

async function hasAudit(
  ctx: PluginContext,
  eventType: PluginAuditEventType,
  targetId?: string,
): Promise<{ ok: boolean; audit: { executorId: string | null; targetId: string | null } }> {
  const audit = await ctx.guild.fetchAudit(eventType);
  if (!audit?.executorId) {
    return { ok: false, audit: { executorId: null, targetId: null } };
  }
  if (targetId !== undefined && audit.targetId !== targetId) {
    return { ok: false, audit };
  }
  if (!(await withinAuditWindow(audit))) {
    return { ok: false, audit };
  }
  return { ok: true, audit };
}

async function getExecutor(
  guild: PluginGuild,
  executorId: string,
): Promise<{ member: PluginMemberRecord; botId: string | null } | null> {
  const botId = await guild.getBotUserId();
  const member = await guild.fetchMember(executorId);
  if (!member || isWhitelisted(executorId, member.roleIds, botId)) {
    return null;
  }
  return { member, botId };
}

async function applyAction(guild: PluginGuild, userId: string, action: string, reason: string): Promise<void> {
  switch (action) {
    case '1':
      await guild.kick(userId, reason);
      break;
    case '2':
      await guild.setRoles(userId, []);
      break;
    case '3':
      await guild.ban(userId, reason);
      break;
    case '4': {
      const roleId = settings.protection.actions.mute_role ?? null;
      if (!roleId) {
        pluginCtx?.logger.warn('action 4 (mute) selected but mute_role is not set');
        return;
      }
      await guild.addRole(userId, roleId);
      break;
    }
    case '5': {
      const roleId = settings.protection.actions.jail_role ?? null;
      if (!roleId) {
        pluginCtx?.logger.warn('action 5 (jail) selected but jail_role is not set');
        return;
      }
      await guild.addRole(userId, roleId);
      break;
    }
    default:
      pluginCtx?.logger.warn(`unknown protection action: ${action}`);
  }
}

async function handleLimitEvent(
  ctx: PluginContext,
  userId: string,
  eventName: string,
  config: AntiLimitFeature,
  revert: () => Promise<unknown>,
  label: string,
): Promise<void> {
  if (!config.enabled) {
    return;
  }
  const executor = await getExecutor(ctx.guild, userId);
  if (!executor) {
    return;
  }
  const count = trackAction(ctx.guildId, userId, eventName, config.limit);
  const reason = `${label}: تجاوز الحد (${count}/${config.limit})`;
  if (count >= config.limit) {
    try {
      await revert();
    } catch (error: unknown) {
      ctx.logger.warn(`revert failed (${eventName}): ${getErrorMessage(error)}`);
    }
    await applyAction(ctx.guild, userId, config.action, reason);
    ctx.logger.warn(`${label} triggered on ${userId}`, { count, limit: config.limit });
    await report(ctx, `${label} — تم التدخل`, `العضو: <@${userId}>\nالعد: ${count}/${config.limit}\nنُفّذ: ${actionLabel(config.action)}`, COLORS.danger);
  }
}

async function handleImmediateEvent(
  ctx: PluginContext,
  executorId: string,
  eventName: string,
  config: AntiActionFeature | null,
  revert: () => Promise<unknown>,
  label: string,
): Promise<void> {
  if (!config?.enabled) {
    return;
  }
  const executor = await getExecutor(ctx.guild, executorId);
  if (!executor) {
    return;
  }
  try {
    await revert();
  } catch (error: unknown) {
    ctx.logger.warn(`revert failed (${eventName}): ${getErrorMessage(error)}`);
  }
  await applyAction(ctx.guild, executorId, config.action, `${label}: إجراء غير مصرح به`);
  ctx.logger.warn(`${label} triggered on ${executorId}`);
  await report(ctx, `${label} — تم التدخل`, `العضو: <@${executorId}>\nنُفّذ: ${actionLabel(config.action)}`, COLORS.danger);
}

function report(ctx: PluginContext, title: string, content: string, color: number): Promise<void> {
  const channelId = settings.security.channelId;
  if (!channelId) {
    return Promise.resolve();
  }
  return ctx.messages
    .sendChannel(channelId, ctx.embeds.build({ title, description: content, color }))
    .then(() => undefined)
    .catch((error: unknown) => {
      ctx.logger.warn(`failed to send security report: ${getErrorMessage(error)}`);
    });
}

async function handleGuildBanAdd(ctx: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable || !settings.protection.anti_ban.enabled) {
    return;
  }
  const config = settings.protection.anti_ban;
  const userId = asString(payload.userId);
  if (!userId) {
    return;
  }
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'BAN_ADD');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleLimitEvent(ctx, result.audit.executorId, 'ban', config, () => ctx.guild.unban(userId, 'Anti-ban: auto-unban'), 'منع الحظر (Anti-Ban)');
}

async function handleGuildMemberRemove(ctx: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable || !settings.protection.anti_kick.enabled) {
    return;
  }
  const config = settings.protection.anti_kick;
  const userId = asString(payload.userId);
  if (!userId) {
    return;
  }
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'KICK', userId);
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleLimitEvent(ctx, result.audit.executorId, 'kick', config, async () => undefined, 'منع الكير (Anti-Kick)');
}

async function handleChannelCreate(ctx: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable) {
    return;
  }
  const config = settings.protection.anti_channel_create;
  const channelId = asString(payload.channelId);
  if (!channelId) {
    return;
  }
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'CHANNEL_CREATE');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleLimitEvent(
    ctx,
    result.audit.executorId,
    'channel_create',
    config,
    () => ctx.channels.delete(channelId, 'Anti-channel-create: auto-delete'),
    'منع إنشاء القنوات (Anti Channel-Create)',
  );
}

async function handleChannelDelete(ctx: PluginContext, _payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable) {
    return;
  }
  const config = settings.protection.anti_channel_delete;
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'CHANNEL_DELETE');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleLimitEvent(
    ctx,
    result.audit.executorId,
    'channel_delete',
    config,
    async () => undefined,
    'منع حذف القنوات (Anti Channel-Delete)',
  );
}

async function handleRoleCreate(ctx: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable) {
    return;
  }
  const config = settings.protection.anti_role_create;
  const roleId = asString(payload.roleId);
  if (!roleId) {
    return;
  }
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'ROLE_CREATE');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleLimitEvent(
    ctx,
    result.audit.executorId,
    'role_create',
    config,
    () => ctx.guild.deleteRole(roleId, 'Anti-role-create: auto-delete'),
    'منع إنشاء الرتب (Anti Role-Create)',
  );
}

async function handleRoleDelete(ctx: PluginContext, _payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable) {
    return;
  }
  const config = settings.protection.anti_role_delete;
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'ROLE_DELETE');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleLimitEvent(
    ctx,
    result.audit.executorId,
    'role_delete',
    config,
    async () => undefined,
    'منع حذف الرتب (Anti Role-Delete)',
  );
}

async function handleMemberUpdate(ctx: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable || !settings.protection.anti_role_add.enabled) {
    return;
  }
  const config = settings.protection.anti_role_add;
  const userId = asString(payload.userId);
  if (!userId) {
    return;
  }
  const oldRoleIds = Array.isArray(payload.oldRoleIds) ? (payload.oldRoleIds as string[]) : [];
  const newRoleIds = Array.isArray(payload.newRoleIds) ? (payload.newRoleIds as string[]) : [];
  const addedRoleIds = newRoleIds.filter((id) => !oldRoleIds.includes(id));
  if (addedRoleIds.length === 0) {
    return;
  }
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'MEMBER_ROLE_UPDATE');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleLimitEvent(
    ctx,
    result.audit.executorId,
    'role_add',
    config,
    async () => {
      for (const roleId of addedRoleIds) {
        await ctx.guild.removeRole(userId, roleId).catch(() => undefined);
      }
    },
    'منع إضافة الرتب (Anti Role-Add)',
  );
}

async function handleGuildMemberAdd(ctx: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable || !settings.protection.anti_bots.enabled) {
    return;
  }
  const config = settings.protection.anti_bots;
  const userId = asString(payload.userId);
  const isBot = payload.userBot === true;
  if (!userId || !isBot) {
    return;
  }
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'BOT_ADD');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  await handleImmediateEvent(
    ctx,
    result.audit.executorId,
    'bots',
    config,
    () => ctx.guild.kick(userId, 'Anti-bot: unauthorized bot removed'),
    'منع إضافة البوتات (Anti-Bots)',
  );
}

async function handleWebhooksUpdate(ctx: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (!settings.protection.enable || !settings.protection.anti_webhooks.enabled) {
    return;
  }
  const config = settings.protection.anti_webhooks;
  const channelId = asString(payload.channelId);
  if (!channelId) {
    return;
  }
  await delay(AUDIT_WAIT_MS);
  const result = await hasAudit(ctx, 'WEBHOOK_CREATE');
  if (!result.ok || !result.audit.executorId) {
    return;
  }
  const botId = await ctx.guild.getBotUserId();
  if (result.audit.executorId === botId) {
    return;
  }
  const webhooks = await ctx.guild.fetchWebhooks(channelId);
  const target = webhooks.find((webhook) => webhook.ownerId === result.audit.executorId);
  const revert: () => Promise<unknown> = target
    ? () => ctx.guild.deleteWebhook(target.id, 'Anti-webhook: unauthorized webhook deleted')
    : async () => undefined;
  await handleImmediateEvent(
    ctx,
    result.audit.executorId,
    'webhooks',
    config,
    revert,
    'منع إنشاء الويب هوكس (Anti-Webhooks)',
  );
}

function registerListeners(ctx: PluginContext): void {
  const offs: Array<() => void> = [];
  offs.push(
    ctx.events.on('guildBanAdd', (payload) => {
      void handleGuildBanAdd(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security guildBanAdd: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('guildMemberRemove', (payload) => {
      void handleGuildMemberRemove(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security guildMemberRemove: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('channelCreate', (payload) => {
      void handleChannelCreate(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security channelCreate: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('channelDelete', (payload) => {
      void handleChannelDelete(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security channelDelete: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('roleCreate', (payload) => {
      void handleRoleCreate(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security roleCreate: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('roleDelete', (payload) => {
      void handleRoleDelete(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security roleDelete: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('guildMemberAdd', (payload) => {
      void handleGuildMemberAdd(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security guildMemberAdd: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('guildMemberUpdate', (payload) => {
      void handleMemberUpdate(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security guildMemberUpdate: ${getErrorMessage(error)}`),
      );
    }),
  );
  offs.push(
    ctx.events.on('webhooksUpdate', (payload) => {
      void handleWebhooksUpdate(ctx, payload).catch((error: unknown) =>
        ctx.logger.warn(`security webhooksUpdate: ${getErrorMessage(error)}`),
      );
    }),
  );
  cleanups = offs;
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function actionLabel(action: string): string {
  switch (action) {
    case '1':
      return 'كير';
    case '2':
      return 'إزالة الرتب';
    case '3':
      return 'حظر';
    case '4':
      return 'ميوت';
    case '5':
      return 'سجن';
    default:
      return action;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mergeSettings(base: SecuritySettings, patch: unknown): SecuritySettings {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return base;
  }
  const out: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const baseValue = (base as unknown as Record<string, unknown>)[key];
    if (
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      out[key] = mergeSettings(baseValue as never, value);
    } else {
      out[key] = value;
    }
  }
  return out as unknown as SecuritySettings;
}

async function loadSettings(ctx: PluginContext): Promise<SecuritySettings> {
  const stored = await ctx.storage.get<unknown>('settings').catch(() => null);
  return mergeSettings(DEFAULTS, stored);
}

function text(content: string): CoreMessage {
  return { type: 'text', content };
}

const plugin: PluginModule = {
  async onEnable(ctx: PluginContext): Promise<void> {
    pluginCtx = ctx;
    settings = await loadSettings(ctx);
    registerListeners(ctx);
    cleanupTimer = setInterval(cleanExpired, TRACK_WINDOW_MS);
    ctx.logger.info('security enabled', { guildId: ctx.guildId });
  },
  onDisable(): void {
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch {
        void 0;
      }
    }
    cleanups = [];
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    trackers.clear();
    pluginCtx = null;
  },
};

export default plugin;