import type {
  CommandInvocation,
  PluginContext,
  PluginEventPayload,
  PluginModule,
} from '@vortex/core';
import type { CoreMessage } from '@vortex/types';

interface LogSettings {
  enabled: boolean;
  channelId: string | null;
  messageEdit: boolean;
  messageDelete: boolean;
  memberJoin: boolean;
  memberLeave: boolean;
  banAdd: boolean;
  banRemove: boolean;
  channelCreate: boolean;
  channelDelete: boolean;
  roleCreate: boolean;
  roleDelete: boolean;
  inviteCreate: boolean;
}

interface WordProtectionSettings {
  enabled: boolean;
  list: string;
  warnOnMatch: boolean;
}

interface RateProtectionSettings {
  enabled: boolean;
  windowSeconds: number;
  maxMessages: number;
}

interface ProtectionSettings {
  words: WordProtectionSettings;
  rate: RateProtectionSettings;
  ignoredRoleIds: string;
  ignoredChannelIds: string;
}

interface CommandToggle {
  enabled: boolean;
}

interface ModerationSettings {
  logs: LogSettings;
  protection: ProtectionSettings;
  commands: {
    moderatorRoleId: string | null;
    clear: CommandToggle;
    say: CommandToggle;
    embed: CommandToggle;
    announce: CommandToggle;
    lock: CommandToggle;
    unlock: CommandToggle;
    warn: CommandToggle;
    warnings: CommandToggle;
    invite: CommandToggle;
  };
}

interface WarnEntry {
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: string;
}

const DEFAULTS: ModerationSettings = {
  logs: {
    enabled: false,
    channelId: null,
    messageEdit: true,
    messageDelete: true,
    memberJoin: true,
    memberLeave: true,
    banAdd: true,
    banRemove: true,
    channelCreate: true,
    channelDelete: true,
    roleCreate: true,
    roleDelete: true,
    inviteCreate: false,
  },
  protection: {
    words: { enabled: false, list: '', warnOnMatch: true },
    rate: { enabled: false, windowSeconds: 5, maxMessages: 6 },
    ignoredRoleIds: '',
    ignoredChannelIds: '',
  },
  commands: {
    moderatorRoleId: null,
    clear: { enabled: true },
    say: { enabled: true },
    embed: { enabled: true },
    announce: { enabled: true },
    lock: { enabled: true },
    unlock: { enabled: true },
    warn: { enabled: true },
    warnings: { enabled: true },
    invite: { enabled: true },
  },
};

const SEND_MESSAGES = 2048n;
const COLORS = {
  join: 0x22c55e,
  leave: 0xf97316,
  delete: 0xef4444,
  edit: 0xfacc15,
  ban: 0x7f1d1d,
  unban: 0x22c55e,
  channel: 0x3b82f6,
  role: 0xa855f7,
  invite: 0x8b5cf6,
} as const;

let settings: ModerationSettings = DEFAULTS;
let cleanups: Array<() => void> = [];
const memberRoles = new Map<string, string[]>();
const rateBuffer = new Map<string, number[]>();
let pluginCtx: PluginContext | null = null;

function secondsNow(): number {
  return Date.now() / 1000;
}

function warnAudit(channelId: string, messageId: string, userId: string, reason: string): Promise<boolean> {
  const ctx = pluginCtx;
  if (!ctx) {
    return Promise.resolve(false);
  }
  return ctx.messages
    .delete(channelId, messageId)
    .then(() => addWarn(ctx, userId, 'system', reason))
    .then(() => true)
    .catch(() => false);
}

async function addWarn(ctx: PluginContext, userId: string, moderatorId: string, reason: string): Promise<void> {
  const stored = await ctx.storage.get<{ entries: WarnEntry[] }>('warns').catch(() => null);
  const entries: WarnEntry[] = stored?.entries ?? [];
  entries.push({ userId, moderatorId, reason, createdAt: new Date().toISOString() });
  await ctx.storage.set('warns', { entries });
  try {
    await ctx.messages.sendDirect(userId, text(`⚠️ تم تسجيل إنذار لك. السبب: ${reason}`));
  } catch {
    void 0;
  }
}

function isIgnoredForProtection(userId: string, channelId: string | undefined): boolean {
  const ctx = pluginCtx;
  const roles = ctx ? (memberRoles.get(userId) ?? []) : [];
  const ignoredRoles = splitLines(settings.protection.ignoredRoleIds);
  if (roles.some((roleId) => ignoredRoles.includes(roleId))) {
    return true;
  }
  if (channelId && splitLines(settings.protection.ignoredChannelIds).includes(channelId)) {
    return true;
  }
  return false;
}

function matchesBlockedWord(content: string): string | null {
  const list = settings.protection.words.list;
  if (!list) {
    return null;
  }
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  const lines: string[] = splitLines(list)
    .map((line) => line.toLowerCase())
    .filter(Boolean);
  for (const line of lines) {
    const hasPrefix = line.startsWith('*');
    const hasSuffix = line.endsWith('*');
    const core = line.replace(/\*/g, '').trim();
    if (!core) {
      continue;
    }
    if (hasPrefix && hasSuffix) {
      if (normalized.includes(core)) {
        return line;
      }
    } else if (hasPrefix) {
      if (normalized.endsWith(core)) {
        return line;
      }
    } else if (hasSuffix) {
      if (normalized.startsWith(core)) {
        return line;
      }
    } else {
      const escaped = core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundary = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'u');
      const tokens = normalized.split(/[\s.,!?؛،:()\-/+]+/);
      if (tokens.includes(core) || boundary.test(normalized)) {
        return line;
      }
    }
  }
  return null;
}

function isRateViolation(userId: string): boolean {
  const now = secondsNow();
  const windowSeconds = Math.max(1, settings.protection.rate.windowSeconds);
  const maxMessages = Math.max(1, settings.protection.rate.maxMessages);
  const key = userId;
  const stamps = (rateBuffer.get(key) ?? []).filter((t) => now - t <= windowSeconds);
  stamps.push(now);
  rateBuffer.set(key, stamps);
  if (stamps.length > maxMessages) {
    rateBuffer.delete(key);
    return true;
  }
  if (stamps.length === 1) {
    setTimeout(() => {
      const current = rateBuffer.get(key) ?? [];
      rateBuffer.set(key, current.filter((t) => secondsNow() - t <= windowSeconds));
    }, windowSeconds * 1000);
  }
  return false;
}

async function handleMessageCreate(payload: PluginEventPayload): Promise<void> {
  const ctx = pluginCtx;
  if (!ctx) {
    return;
  }
  const guildId = asString(payload.guildId);
  if (!guildId || guildId !== ctx.guildId) {
    return;
  }
  const channelId = asString(payload.channelId);
  const messageId = asString(payload.messageId);
  const authorId = asString(payload.authorId);
  const content = asString(payload.content);
  if (!channelId || !messageId || !authorId || !content) {
    return;
  }
  if (isIgnoredForProtection(authorId, channelId)) {
    return;
  }
  const protection = settings.protection;
  const matchedWord = protection.words.enabled ? matchesBlockedWord(content) : null;
  const rateViolation = protection.rate.enabled ? isRateViolation(authorId) : false;
  if (matchedWord || rateViolation) {
    const reason = matchedWord ? `كلمة محظورة: ${matchedWord}` : 'إرسال سريع (سبام)';
    const shouldWarn = matchedWord ? protection.words.warnOnMatch : true;
    const deleted = await warnAudit(channelId, messageId, authorId, reason);
    if (!shouldWarn && deleted) {
      if (ctx) {
        try {
          await ctx.messages.sendDirect(authorId, text(`🚫 تم حذف رسالتك: ${reason}`));
        } catch {
          void 0;
        }
      }
    }
  }
}

function registerListeners(ctx: PluginContext): void {
  const offs: Array<() => void> = [];
  offs.push(
    ctx.events.on('messageCreate', (payload) => {
      void handleMessageCreate(payload).catch((error: unknown) => ctx.logger.warn(`message spike: ${getErrorMessage(error)}`));
    }),
  );
  offs.push(
    ctx.events.on('messageUpdate', (payload) => {
      if (!settings.logs.enabled) return;
      if (!settings.logs.messageEdit) return;
      if (asString(payload.oldContent) === asString(payload.newContent)) return;
      void logCard(ctx, {
        title: '✏️ رسالة معدلة',
        color: COLORS.edit,
        fields: [
          { name: 'العضو', value: `<@${asString(payload.authorId)}>`, inline: true },
          { name: 'القناة', value: `<#${asString(payload.channelId)}>`, inline: true },
          { name: 'قبل', value: truncate(asString(payload.oldContent) || '—', 1000), inline: false },
          { name: 'بعد', value: truncate(asString(payload.newContent) || '—', 1000), inline: false },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('messageDelete', (payload) => {
      if (!settings.logs.enabled) return;
      if (!settings.logs.messageDelete) return;
      const authorName = asString(payload.authorName);
      const content = asString(payload.content);
      if (!authorName || !content) return;
      void logCard(ctx, {
        title: '🗑️ رسالة محذوفة',
        color: COLORS.delete,
        fields: [
          { name: 'العضو', value: `<@${asString(payload.authorId)}>`, inline: true },
          { name: 'القناة', value: `<#${asString(payload.channelId)}>`, inline: true },
          { name: 'المحتوى', value: truncate(content, 1000), inline: false },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('guildMemberAdd', (payload) => {
      const userId = asString(payload.userId);
      memberRoles.set(userId, toRoleIds(payload.roleIds));
      if (!settings.logs.enabled || !settings.logs.memberJoin) return;
      void logCard(ctx, {
        title: '🟢 عضو جديد',
        color: COLORS.join,
        fields: [
          { name: 'العضو', value: `<@${userId}>`, inline: true },
          { name: 'عدد الأعضاء', value: asString(payload.memberCount), inline: true },
          { name: 'تاريخ الحساب', value: asString(payload.userCreatedAt), inline: false },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('guildMemberRemove', (payload) => {
      const userId = asString(payload.userId);
      memberRoles.delete(userId);
      if (!settings.logs.enabled || !settings.logs.memberLeave) return;
      void logCard(ctx, {
        title: '🔻 عضو غادر',
        color: COLORS.leave,
        fields: [
          { name: 'العضو', value: `<@${userId}>`, inline: true },
          { name: 'عدد الأعضاء', value: asString(payload.memberCount), inline: true },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('guildBanAdd', (payload) => {
      if (!settings.logs.enabled || !settings.logs.banAdd) return;
      void logCard(ctx, {
        title: '🔨 تم حظر عضو',
        color: COLORS.ban,
        fields: [
          { name: 'العضو', value: `<@${asString(payload.userId)}>`, inline: true },
          { name: 'السبب', value: asString(payload.reason) || 'غير محدد', inline: true },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('guildBanRemove', (payload) => {
      if (!settings.logs.enabled || !settings.logs.banRemove) return;
      void logCard(ctx, {
        title: '✅ فك حظر',
        color: COLORS.unban,
        fields: [{ name: 'العضو', value: `<@${asString(payload.userId)}>`, inline: true }],
      });
    }),
  );
  offs.push(
    ctx.events.on('channelCreate', (payload) => {
      if (!settings.logs.enabled || !settings.logs.channelCreate) return;
      void logCard(ctx, {
        title: '➕ قناة جديدة',
        color: COLORS.channel,
        fields: [
          { name: 'القناة', value: asString(payload.channelName) || asString(payload.channelId), inline: true },
          { name: 'النوع', value: channelTypeLabel(num(payload.channelType)), inline: true },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('channelDelete', (payload) => {
      if (!settings.logs.enabled || !settings.logs.channelDelete) return;
      void logCard(ctx, {
        title: '➖ قناة محذوفة',
        color: COLORS.channel,
        fields: [
          { name: 'القناة', value: asString(payload.channelName) || asString(payload.channelId), inline: true },
          { name: 'النوع', value: channelTypeLabel(num(payload.channelType)), inline: true },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('roleCreate', (payload) => {
      if (!settings.logs.enabled || !settings.logs.roleCreate) return;
      void logCard(ctx, {
        title: '➕ رتبة جديدة',
        color: COLORS.role,
        fields: [
          { name: 'الرتبة', value: `<@&${asString(payload.roleId)}>`, inline: true },
          { name: 'الاسم', value: asString(payload.roleName), inline: true },
        ],
      });
    }),
  );
  offs.push(
    ctx.events.on('roleDelete', (payload) => {
      if (!settings.logs.enabled || !settings.logs.roleDelete) return;
      void logCard(ctx, {
        title: '➖ رتبة محذوفة',
        color: COLORS.role,
        fields: [{ name: 'الاسم', value: asString(payload.roleName), inline: true }],
      });
    }),
  );
  offs.push(
    ctx.events.on('inviteCreate', (payload) => {
      if (!settings.logs.enabled || !settings.logs.inviteCreate) return;
      void logCard(ctx, {
        title: '🔗 دعوة جديدة',
        color: COLORS.invite,
        fields: [
          { name: 'الكود', value: asString(payload.inviteCode), inline: true },
          { name: 'القناة', value: `<#${asString(payload.channelId)}>`, inline: true },
          { name: 'المنشئ', value: `<@${asString(payload.inviterId)}>`, inline: true },
        ],
      });
    }),
  );
  cleanups = offs;
}

function toRoleIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === 'string');
}

function logCard(
  ctx: PluginContext,
  input: { title: string; color: number; fields: Array<{ name: string; value: string; inline: boolean }> },
): Promise<void> {
  const channelId = settings.logs.channelId;
  if (!channelId) {
    return Promise.resolve();
  }
  return ctx.messages
    .sendChannel(channelId, ctx.embeds.build(input))
    .then(() => undefined)
    .catch((error: unknown) => {
      ctx.logger.warn(`failed to send log: ${getErrorMessage(error)}`);
    });
}

function channelTypeLabel(value: number): string {
  switch (value) {
    case 0:
      return 'نصية';
    case 2:
      return 'صوتية';
    case 4:
      return 'تصنيف';
    case 5:
      return 'إعلانات';
    case 13:
      return 'مرحلة';
    case 15:
      return 'منتدى';
    default:
      return String(value);
  }
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function mergeSettings(base: ModerationSettings, patch: unknown): ModerationSettings {
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
  return out as unknown as ModerationSettings;
}

async function loadSettings(ctx: PluginContext): Promise<ModerationSettings> {
  const stored = await ctx.storage.get<unknown>('settings').catch(() => null);
  return mergeSettings(DEFAULTS, stored);
}

function text(content: string): CoreMessage {
  return { type: 'text', content };
}

function hexColor(value: string): number {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  if (match) {
    return Number.parseInt(match[1] ?? '', 16);
  }
  return COLORS.channel;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isModerator(invocation: CommandInvocation): boolean {
  const roleId = settings.commands.moderatorRoleId;
  if (!roleId) {
    return true;
  }
  return invocation.memberRoleIds.includes(roleId);
}

function extractUserId(value: string): string {
  const mention = /^<@!?(\d+)>$/.exec(value.trim());
  if (mention?.[1]) {
    return mention[1];
  }
  return value.trim().replace(/\D/g, '');
}

function registerCommands(ctx: PluginContext): void {
  const c = settings.commands;
  const registrations: Array<() => Promise<void>> = [];

  if (c.clear.enabled) {
    registrations.push(() =>
      ctx.commands.register(
        {
          name: 'clear',
          description: 'مسح عدد محدد من الرسائل في قناة',
          type: 'SLASH',
          autoDeleteAuthorMessage: true,
          options: [
            { name: 'amount', description: 'عدد الرسائل (1-100)', type: 'INTEGER', required: false },
            { name: 'channel', description: 'معرّف القناة (الافتراضي: القناة الحالية)', type: 'STRING', required: false },
          ],
          handler: async (inv) => {
            if (!isModerator(inv)) return;
            const amount = clamp(Math.floor(typeof inv.options.amount === 'number' ? inv.options.amount : 20), 1, 100);
            const channelId = asString(inv.options.channel) || inv.channelId;
            const entries = await ctx.messages.readChannel(channelId, amount + 1);
            let deleted = 0;
            for (const entry of entries) {
              try {
                await ctx.messages.delete(entry.channelId, entry.id);
                deleted += 1;
              } catch {
                void 0;
              }
            }
            await inv.respond(text(`🗑️ تم مسح ${deleted} رسالة في <#${channelId}>.`));
          },
        },
        { autoDeleteAuthorMessage: true },
      ),
    );
  }

  if (c.say.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'say',
        description: 'إرسال رسالة نصية باسم البوت',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [{ name: 'message', description: 'نص الرسالة', type: 'STRING', required: true }],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          await ctx.messages.sendChannel(inv.channelId, text(asString(inv.options.message)));
          await inv.respond(text('✅ تم الإرسال.'));
        },
      }),
    );
  }

  if (c.embed.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'embed',
        description: 'إرسال رسالة مضمّنة بأناقة',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [
          { name: 'description', description: 'الوصف (النص الرئيسي)', type: 'STRING', required: true },
          { name: 'title', description: 'العنوان', type: 'STRING', required: false },
          { name: 'color', description: 'اللون بصيغة hex مثال: #22c55e', type: 'STRING', required: false },
        ],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          const embed = ctx.embeds.build({
            title: asString(inv.options.title) || undefined,
            description: asString(inv.options.description),
            color: hexColor(asString(inv.options.color)),
          });
          await ctx.messages.sendChannel(inv.channelId, embed);
          await inv.respond(text('✅ تم الإرسال.'));
        },
      }),
    );
  }

  if (c.announce.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'announce',
        description: 'إرسال إعلان إلى قناة محددة',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [
          { name: 'channel', description: 'معرّف القناة المستهدفة', type: 'STRING', required: true },
          { name: 'message', description: 'نص الإعلان', type: 'STRING', required: true },
          { name: 'title', description: 'عنوان الإعلان', type: 'STRING', required: false },
        ],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          const channelId = asString(inv.options.channel);
          const embed = ctx.embeds.build({
            title: asString(inv.options.title) || '📢 إعلان',
            description: asString(inv.options.message),
            color: COLORS.channel,
          });
          await ctx.messages.sendChannel(channelId, embed);
          await inv.respond(text(`✅ تم نشر الإعلان في <#${channelId}>.`));
        },
      }),
    );
  }

  if (c.lock.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'lock',
        description: 'إغلاق قناة أمام @everyone',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [{ name: 'channel', description: 'معرّف القناة (الافتراضي: الحالية)', type: 'STRING', required: false }],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          const channelId = asString(inv.options.channel) || inv.channelId;
          await ctx.channels.setPermissions(
            channelId,
            [{ id: inv.guildId, type: 'role', allow: 0n, deny: SEND_MESSAGES }],
            'Moderation /lock',
          );
          await inv.respond(text(`🔒 تم إغلاق <#${channelId}>.`));
        },
      }),
    );
  }

  if (c.unlock.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'unlock',
        description: 'فتح قناة مغلقة أمام @everyone',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [{ name: 'channel', description: 'معرّف القناة (الافتراضي: الحالية)', type: 'STRING', required: false }],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          const channelId = asString(inv.options.channel) || inv.channelId;
          await ctx.channels.setPermissions(
            channelId,
            [{ id: inv.guildId, type: 'role', allow: SEND_MESSAGES, deny: 0n }],
            'Moderation /unlock',
          );
          await inv.respond(text(`🔓 تم فتح <#${channelId}>.`));
        },
      }),
    );
  }

  if (c.warn.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'warn',
        description: 'توجيه إنذار لعضو وحفظه في السجل',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [
          { name: 'user', description: 'العضو المستهدف (منشن أو معرّف)', type: 'STRING', required: true },
          { name: 'reason', description: 'سبب الإنذار', type: 'STRING', required: true },
        ],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          const targetId = extractUserId(asString(inv.options.user));
          if (!targetId) {
            await inv.respond(text('❌ معرّف العضو غير صالح.'));
            return;
          }
          await addWarn(ctx, targetId, inv.userId, asString(inv.options.reason));
          await inv.respond(text(`⚠️ تم توجيه إنذار لـ <@${targetId}>.`));
        },
      }),
    );
  }

  if (c.warnings.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'warnings',
        description: 'عرض إنذارات عضو',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [{ name: 'user', description: 'العضو (الافتراضي: نفسك)', type: 'STRING', required: false }],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          const targetId = inv.options.user ? extractUserId(asString(inv.options.user)) : inv.userId;
          const stored = await ctx.storage.get<{ entries: WarnEntry[] }>('warns').catch(() => null);
          const entries = (stored?.entries ?? []).filter((entry) => entry.userId === targetId);
          if (entries.length === 0) {
            await inv.respond(text(`✅ لا توجد إنذارات لـ <@${targetId}>.`));
            return;
          }
          const fields = entries
            .slice(-15)
            .reverse()
            .map((entry) => ({
              name: new Date(entry.createdAt).toLocaleString('ar-EG'),
              value: `**السبب:** ${truncate(entry.reason, 200)}\n**بواسطة:** <@${entry.moderatorId}>`,
              inline: false,
            }));
          await inv.respond(
            ctx.embeds.build({
              title: `⚠️ إنذارات <@${targetId}>`,
              description: `الإجمالي: ${entries.length}`,
              color: COLORS.delete,
              fields,
            }),
          );
        },
      }),
    );
  }

  if (c.invite.enabled) {
    registrations.push(() =>
      ctx.commands.register({
        name: 'invite',
        description: 'إنشاء دعوة إلى قناة',
        type: 'SLASH',
        autoDeleteAuthorMessage: true,
        options: [
          { name: 'channel', description: 'معرّف القناة (الافتراضي: الحالية)', type: 'STRING', required: false },
          { name: 'max_uses', description: 'الحد الأقصى للاستخدامات (0 = بلا حد)', type: 'INTEGER', required: false },
          { name: 'max_age_minutes', description: 'مدة الصلاحية بالدقائق (0 = دائم)', type: 'INTEGER', required: false },
        ],
        handler: async (inv) => {
          if (!isModerator(inv)) return;
          const channelId = asString(inv.options.channel) || inv.channelId;
          const maxUses = typeof inv.options.max_uses === 'number' ? Math.max(0, Math.floor(inv.options.max_uses)) : 0;
          const maxAgeMinutes = typeof inv.options.max_age_minutes === 'number' ? Math.max(0, Math.floor(inv.options.max_age_minutes)) : 60;
          const inviteOptions: { maxAgeSeconds?: number; maxUses?: number; unique?: boolean } = { unique: true };
          if (maxAgeMinutes > 0) {
            inviteOptions.maxAgeSeconds = maxAgeMinutes * 60;
          }
          if (maxUses > 0) {
            inviteOptions.maxUses = maxUses;
          }
          const code = await ctx.commands.createInvite(channelId, inviteOptions);
          await inv.respond(text(`🔗 https://discord.gg/${code}`));
        },
      }),
    );
  }

  for (const register of registrations) {
    register().catch((error: unknown) => ctx.logger.warn(`failed to register command: ${getErrorMessage(error)}`));
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const plugin: PluginModule = {
  async onEnable(ctx: PluginContext): Promise<void> {
    pluginCtx = ctx;
    settings = await loadSettings(ctx);
    registerListeners(ctx);
    registerCommands(ctx);
    ctx.logger.info('moderation enabled', { guildId: ctx.guildId });
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
    memberRoles.clear();
    rateBuffer.clear();
    pluginCtx = null;
  },
};

export default plugin;