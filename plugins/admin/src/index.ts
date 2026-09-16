import type {
  CommandHandler,
  CommandInvocation,
  CommandOptionRegistration,
  PluginComponentInteraction,
  PluginContext,
  PluginModule,
} from '@vortex/core';
import type { CoreMessage } from '@vortex/types';

interface AdminSettings {
  prefix: string;
  court: { name: string; logo: string; color: string; logChannel: string | null };
  muteRole: string;
  jailRole: string;
  jailShowRoom: string[];
  autoRole: string;
  whitelistRoles: string[];
  userPermissions: string[];
}

interface CommandConfig {
  enabled: boolean;
  aliases: string[];
  ignoredChannels: string[];
  ignoredRoles: string[];
  enabledChannels: string[];
  allowedRoles: string[];
  allowedUsers: string[];
  requireAdministrator: boolean;
  autoDeleteAuthor: boolean;
  autoDeleteReply: boolean;
}

interface ActionMeta {
  label?: string;
  color?: string;
  emoji?: string;
  enabled?: boolean;
}

interface CaseRecord {
  caseId: string;
  caseCount: number;
  action: string;
  reason: string;
  moderatorId: string;
  moderator: string;
  duration: string;
  durationMs: number;
  endTime: string | null;
  court: string;
  timestamp: string;
}

interface UserRecord {
  username: string;
  tag: string;
  cases: CaseRecord[];
}

type RecordsMap = Record<string, UserRecord>;

interface AfkEntry {
  reason: string;
  timestamp: string;
}

type AfkMap = Record<string, AfkEntry>;

interface JailEntry {
  userId: string;
  caseId: string;
  reason: string;
  moderatorId: string;
  originalRoles: string[];
  jailedAt: string;
  jailEnd: string | null;
  jailDurationMs: number | null;
}

type JailMap = Record<string, JailEntry>;

interface AntiConfig {
  enabled: boolean;
  limit: number;
  action: string;
}

interface ProtectionSettings {
  anti_ban: AntiConfig;
  anti_kick: AntiConfig;
  anti_bots: { enabled: boolean; action: string };
  anti_webhooks: { enabled: boolean; action: string };
  anti_channel_create: AntiConfig;
  anti_channel_delete: AntiConfig;
  anti_role_create: AntiConfig;
  anti_role_delete: AntiConfig;
  anti_role_add: AntiConfig;
}

const CASE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const COLORS = {
  success: 0x57f287,
  bad: 0xed4245,
  warn: 0xfee75c,
  info: 0x5865f2,
  gold: 0xffd700,
};

const PERM_VIEW_CHANNEL = 1 << 10;
const PERM_SEND_MESSAGES = 1 << 11;
const PERM_READ_MESSAGE_HISTORY = 1 << 16;

const DEFAULT_SETTINGS: AdminSettings = {
  prefix: '!',
  court: { name: 'المحكمة العليا', logo: '', color: '#FFD700', logChannel: '' },
  muteRole: '',
  jailRole: '',
  jailShowRoom: [],
  autoRole: '',
  whitelistRoles: [],
  userPermissions: [],
};

const ALL_COMMAND_IDS: string[] = [
  'ping', 'help', 'user', 'server', 'roles', 'avatar', 'banner_server', 'banner_user',
  'logo_server', 'afk', 'say', 'ban', 'kick', 'mute', 'unmute', 'unban', 'unban_all',
  'jail', 'unjail', 'warn', 'unwarn', 'warning', 'clear', 'lock', 'unlock', 'slowmode',
  'rename', 'temp_role', 'add_role', 'remove_role', 'multi_role', 'auto_role', 'come',
  'set_prefix', 'set_perm', 'set_perm_all', 'set_perm_reset', 'set_whitelist',
  'actions_role_mute', 'actions_role_jail', 'actions_show_room_jail', 'actions_color',
  'actions_enabled', 'actions_label', 'actions_log', 'court_set_color', 'court_set_log',
  'court_set_logo', 'court_set_name', 'anti_ban', 'anti_kick', 'anti_bots',
  'anti_webhooks', 'anti_channel_create', 'anti_channel_delete', 'anti_role_create',
  'anti_role_delete', 'anti_role_add',
];

function defaultCommandConfig(commandId: string): CommandConfig {
  return {
    enabled: commandId !== 'afk',
    aliases: [],
    ignoredChannels: [],
    ignoredRoles: [],
    enabledChannels: [],
    allowedRoles: [],
    allowedUsers: [],
    requireAdministrator: false,
    autoDeleteAuthor: false,
    autoDeleteReply: false,
  };
}

const DEFAULT_COMMANDS: Record<string, CommandConfig> = Object.fromEntries(
  ALL_COMMAND_IDS.map((id) => [id, defaultCommandConfig(id)]),
);

const DEFAULT_PROTECTION: ProtectionSettings = {
  anti_ban: { enabled: false, limit: 3, action: '3' },
  anti_kick: { enabled: false, limit: 3, action: '3' },
  anti_bots: { enabled: false, action: '3' },
  anti_webhooks: { enabled: false, action: '3' },
  anti_channel_create: { enabled: false, limit: 3, action: '3' },
  anti_channel_delete: { enabled: false, limit: 3, action: '3' },
  anti_role_create: { enabled: false, limit: 3, action: '3' },
  anti_role_delete: { enabled: false, limit: 3, action: '3' },
  anti_role_add: { enabled: false, limit: 3, action: '3' },
};

const ADMIN_COMMANDS = new Set([
  'say', 'ban', 'kick', 'mute', 'unmute', 'unban', 'unban_all', 'jail', 'unjail',
  'warn', 'unwarn', 'clear', 'lock', 'unlock', 'slowmode', 'rename', 'temp_role',
  'add_role', 'remove_role', 'multi_role', 'auto_role', 'set_prefix', 'set_perm',
  'set_perm_all', 'set_perm_reset', 'set_whitelist', 'actions_role_mute',
  'actions_role_jail', 'actions_show_room_jail', 'actions_color', 'actions_enabled',
  'actions_label', 'actions_log', 'court_set_color', 'court_set_log', 'court_set_logo',
  'court_set_name', 'anti_ban', 'anti_kick', 'anti_bots', 'anti_webhooks',
  'anti_channel_create', 'anti_channel_delete', 'anti_role_create', 'anti_role_delete',
]);

// ---------- utilities ----------

function text(content: string): CoreMessage {
  return { type: 'text', content };
}

function genCaseId(): string {
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += CASE_ALPHABET[Math.floor(Math.random() * CASE_ALPHABET.length)];
  }
  return out;
}

function parseHexColor(value: string | undefined, fallback = COLORS.gold): number {
  if (!value) return fallback;
  const hex = value.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const parsed = parseInt(hex, 16);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(0xffffff, Math.max(0, parsed));
}

function parseDuration(input: string | undefined): number | null {
  if (!input) return null;
  const match = /^(\d+)\s*(s|sec|ث|m|min|دق|h|ساعة|d|يوم|w|اسبوع|mo|شهر|y|سنة)?$/i.exec(input.trim());
  if (!match) return null;
  const amount = parseInt(match[1] ?? '', 10);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = (match[2] || 'm').toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000, sec: 1000,
    m: 60_000, min: 60_000, 'دق': 60_000,
    h: 3_600_000, 'ساعة': 3_600_000,
    d: 86_400_000, 'يوم': 86_400_000,
    w: 604_800_000, 'اسبوع': 604_800_000,
    mo: 2_592_000_000, 'شهر': 2_592_000_000,
    y: 31_536_000_000, 'سنة': 31_536_000_000,
  };
  return amount * (multipliers[unit] ?? 60_000);
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} دقيقة`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours} ساعة و ${minutes} دقيقة` : `${hours} ساعة`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (days < 30) return rest ? `${days} يوم و ${rest} ساعة` : `${days} يوم`;
  const months = Math.floor(days / 30);
  return `${months} شهر`;
}

function ageFromTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return 'غير معروف';
  const started = new Date(timestamp).getTime();
  if (Number.isNaN(started)) return 'غير معروف';
  return formatDuration(Math.max(0, Date.now() - started));
}

function stripMention(raw: string): string {
  return raw.replace(/[<@!&#>]/g, '').trim();
}

function escapeUsername(value: string): string {
  return value.replace(/`/g, '').replace(/\*\*/g, '');
}

// ---------- storage helpers ----------

async function getSettings(ctx: PluginContext): Promise<AdminSettings> {
  const value = await ctx.storage.get<AdminSettings>('settings');
  return value ?? structuredClone(DEFAULT_SETTINGS);
}

async function getCommands(ctx: PluginContext): Promise<Record<string, CommandConfig>> {
  const value = await ctx.storage.get<Record<string, CommandConfig>>('commands');
  return value ?? structuredClone(DEFAULT_COMMANDS);
}

async function getCommand(ctx: PluginContext, commandId: string): Promise<CommandConfig> {
  const all = await getCommands(ctx);
  return all[commandId] ?? defaultCommandConfig(commandId);
}

async function patchCommand(
  ctx: PluginContext,
  commandId: string,
  patch: Partial<CommandConfig>,
): Promise<void> {
  const all = await getCommands(ctx);
  const current = all[commandId] ?? defaultCommandConfig(commandId);
  all[commandId] = { ...current, ...patch };
  await ctx.storage.set('commands', all);
}

async function getActionMeta(ctx: PluginContext): Promise<Record<string, ActionMeta>> {
  const value = await ctx.storage.get<Record<string, ActionMeta>>('actionMeta');
  return value ?? {};
}

async function saveActionMeta(ctx: PluginContext, commandId: string, meta: ActionMeta): Promise<void> {
  const all = await getActionMeta(ctx);
  all[commandId] = { ...(all[commandId] ?? {}), ...meta };
  await ctx.storage.set('actionMeta', all);
}

async function getMeta(ctx: PluginContext, commandId: string): Promise<ActionMeta> {
  const all = await getActionMeta(ctx);
  return all[commandId] ?? {};
}

async function getRecords(ctx: PluginContext): Promise<RecordsMap> {
  const value = await ctx.storage.get<RecordsMap>('records');
  return value ?? {};
}

async function saveRecords(ctx: PluginContext, records: RecordsMap): Promise<void> {
  await ctx.storage.set('records', records);
}

async function getAfk(ctx: PluginContext): Promise<AfkMap> {
  const value = await ctx.storage.get<AfkMap>('afk');
  return value ?? {};
}

async function saveAfk(ctx: PluginContext, afk: AfkMap): Promise<void> {
  await ctx.storage.set('afk', afk);
}

async function getJailed(ctx: PluginContext): Promise<JailMap> {
  const value = await ctx.storage.get<JailMap>('jailed');
  return value ?? {};
}

async function saveJailed(ctx: PluginContext, jailed: JailMap): Promise<void> {
  await ctx.storage.set('jailed', jailed);
}

async function getProtection(ctx: PluginContext): Promise<ProtectionSettings> {
  const value = await ctx.storage.get<ProtectionSettings>('protection');
  return value ?? structuredClone(DEFAULT_PROTECTION);
}

async function getMembers(ctx: PluginContext): Promise<Record<string, string[]>> {
  const value = await ctx.storage.get<Record<string, string[]>>('members');
  return value ?? {};
}

async function saveMembers(ctx: PluginContext, members: Record<string, string[]>): Promise<void> {
  await ctx.storage.set('members', members);
}

async function readSecurity(ctx: PluginContext): Promise<Record<string, unknown>> {
  const value = await ctx.storage.readOther<Record<string, unknown>>('security', 'settings');
  return value ?? {};
}

async function writeSecurity(ctx: PluginContext, settings: Record<string, unknown>): Promise<void> {
  await ctx.storage.writeOther('security', 'settings', settings);
}

function buildFooter(settings: AdminSettings): {
  text: string;
  iconSource: 'custom' | 'none';
  iconUrl?: string;
} {
  const base = `Court System • ${settings.court.name || ''}`;
  const logo = (settings.court.logo ?? '').trim();
  if (logo && /^https?:\/\/[^/]*discord/i.test(logo)) {
    return { text: base, iconSource: 'custom', iconUrl: logo };
  }
  return { text: base, iconSource: 'none' };
}

// ---------- records ----------

async function addCase(
  ctx: PluginContext,
  userId: string,
  record: UserRecord,
  caseData: CaseRecord,
): Promise<void> {
  const records = await getRecords(ctx);
  const existing = records[userId] ?? record;
  existing.cases.push(caseData);
  records[userId] = existing;
  await saveRecords(ctx, records);
}

async function removeCase(ctx: PluginContext, userId: string, caseId: string): Promise<boolean> {
  const records = await getRecords(ctx);
  const record = records[userId];
  if (!record) return false;
  const before = record.cases.length;
  record.cases = record.cases.filter((entry) => entry.caseId !== caseId);
  if (record.cases.length === before) return false;
  await saveRecords(ctx, records);
  return true;
}

// ---------- guards ----------

interface GuardResult {
  ok: boolean;
  reason?: CoreMessage;
}

async function mayRun(
  ctx: PluginContext,
  inv: CommandInvocation,
  commandId: string,
): Promise<GuardResult> {
  const cfg = await getCommand(ctx, commandId);
  if (!cfg.enabled) return { ok: false, reason: text('⛔ هذا الأمر معطل حالياً') };
  if (cfg.allowedUsers.length > 0 && cfg.allowedUsers.includes(inv.userId)) return { ok: true };
  if (cfg.allowedRoles.some((roleId) => inv.memberRoleIds.includes(roleId))) return { ok: true };
  if (cfg.ignoredRoles.some((roleId) => inv.memberRoleIds.includes(roleId))) {
    return { ok: false, reason: text('🚫 رتبتك لا تسمح باستخدام هذا الأمر') };
  }
  if (cfg.ignoredChannels.includes(inv.channelId)) {
    return { ok: false, reason: text('🔇 لا يمكن استخدام هذا الأمر في هذه القناة') };
  }
  if (cfg.enabledChannels.length > 0 && !cfg.enabledChannels.includes(inv.channelId)) {
    return { ok: false, reason: text('📍 هذا الأمر مقيد بقنوات معينة') };
  }
  if (cfg.requireAdministrator || ADMIN_COMMANDS.has(commandId)) {
    const allowed = await ctx.guild.hasPermission(inv.userId, 'Administrator').catch(() => false);
    if (!allowed) return { ok: false, reason: text('🚫 ليس لديك صلاحية لاستخدام هذا الأمر') };
  }
  return { ok: true };
}

function handler(
  ctx: PluginContext,
  commandId: string,
  run: (ctx: PluginContext, inv: CommandInvocation) => Promise<CoreMessage | void>,
): CommandHandler {
  return async (inv: CommandInvocation): Promise<void> => {
    try {
      const guard = await mayRun(ctx, inv, commandId);
      if (!guard.ok) {
        await inv.respond(guard.reason).catch(() => undefined);
        return;
      }
      const result = await run(ctx, inv);
      if (result) await inv.respond(result).catch(() => undefined);
    } catch (error) {
      ctx.logger.error('admin command error', { command: commandId });
      await inv.respond(text('⛔ حدث خطأ أثناء تنفيذ الأمر')).catch(() => undefined);
    }
  };
}

// ---------- argument helpers ----------

function optString(inv: CommandInvocation, name: string): string | undefined {
  const value = inv.options[name];
  return typeof value === 'string' ? value : undefined;
}

function optNum(inv: CommandInvocation, name: string): number | undefined {
  const value = inv.options[name];
  return typeof value === 'number' ? value : undefined;
}

function optBool(inv: CommandInvocation, name: string): boolean | undefined {
  const value = inv.options[name];
  return typeof value === 'boolean' ? value : undefined;
}

function optStringOrArg(inv: CommandInvocation, name: string, startIndex = 0): string {
  const fromOpts = optString(inv, name);
  if (fromOpts !== undefined) return fromOpts;
  if (inv.args.length > startIndex) return inv.args.slice(startIndex).join(' ').trim();
  return '';
}

function argOrOptString(inv: CommandInvocation, name: string, index = 0): string | undefined {
  const arg = inv.args[index];
  if (arg) return arg.trim();
  return optString(inv, name);
}

function resolveChannelId(inv: CommandInvocation, index = 0): string | null {
  const opt = inv.options.channel;
  if (typeof opt === 'string' && opt) return opt;
  const arg = inv.args[index];
  if (!arg) return null;
  const stripped = stripMention(arg);
  return stripped || null;
}

async function resolveUserId(
  ctx: PluginContext,
  inv: CommandInvocation,
  optionName = 'user',
  argIndex = 0,
): Promise<{ userId: string; display: string } | null> {
  const fromOpts = inv.options[optionName];
  if (typeof fromOpts === 'string' && fromOpts) {
    const display = await userDisplay(ctx, fromOpts);
    return { userId: fromOpts, display };
  }
  const arg = inv.args[argIndex];
  if (!arg) return null;
  const candidate = stripMention(arg);
  if (!candidate) return null;
  const user = await ctx.guild.fetchUser(candidate).catch(() => null);
  if (user) return { userId: candidate, display: `\`${user.username}\`` };
  const member = await ctx.guild.fetchMember(candidate).catch(() => null);
  if (member) return { userId: candidate, display: `\`${member.displayName}\`` };
  return null;
}

async function userDisplay(ctx: PluginContext, userId: string): Promise<string> {
  const user = await ctx.guild.fetchUser(userId).catch(() => null);
  return user ? `\`${user.username}\`` : `<@${userId}>`;
}

async function roleDisplay(ctx: PluginContext, roleId: string): Promise<string> {
  const roles = await ctx.guild.fetchRoles().catch(() => []);
  return roles.find((role) => role.id === roleId)?.name ?? roleId;
}

// ---------- card builder ----------

async function logToChannel(
  ctx: PluginContext,
  settings: AdminSettings,
  message: CoreMessage,
): Promise<void> {
  const channelId = settings.court.logChannel;
  if (!channelId) return;
  await ctx.messages.sendChannel(channelId, message).catch(() => undefined);
}

async function buildCard(
  ctx: PluginContext,
  commandId: string,
  data: {
    title?: string;
    target?: string;
    mod?: string;
    reason?: string;
    duration?: string;
    caseInfo?: string;
    color?: string;
  },
): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const meta = await getMeta(ctx, commandId);
  const fields: Array<{ name: string; value: string; inline: boolean }> = [];
  if (data.target) fields.push({ name: '👤 المستهدف', value: data.target, inline: true });
  if (data.mod) fields.push({ name: '🛡️ المسؤول', value: data.mod, inline: true });
  if (data.duration) fields.push({ name: '⏳ المدة', value: data.duration, inline: true });
  if (data.caseInfo) fields.push({ name: '🔖 معرّف الحالة', value: data.caseInfo, inline: true });
  if (data.reason) fields.push({ name: '📝 السبب', value: data.reason, inline: false });
  return ctx.embeds.build({
    type: 'embed',
    title: data.title || meta.label || commandId,
    color: parseHexColor(data.color || meta.color || settings.court.color),
    fields,
    footer: buildFooter(settings),
  });
}

// ---------- interactive menus ----------

async function buildRoleMenu(ctx: PluginContext, kind: 'mute' | 'jail'): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const currentRoleId = kind === 'mute' ? settings.muteRole : settings.jailRole;
  const roles = await ctx.guild.fetchRoles().catch(() => []);
  const current = roles.find((role) => role.id === currentRoleId);
  const options = roles.slice(0, 25).map((role) => ({ label: role.name, value: role.id }));
  const title = kind === 'mute' ? '🎙️ رتبة الميوت' : '🔒 رتبة السجن';
  const description = kind === 'mute'
    ? 'اختر الرتبة التي تُعطى للعضو عند الميوت'
    : 'اختر الرتبة التي تُعطى للعضو عند السجن';
  return ctx.components.build({
    type: 'components_v2',
    components: [
      {
        type: 'container',
        items: [
          { type: 'text_display', content: `# ${title}` },
          { type: 'separator', spacing: 'small', divider: true },
          {
            type: 'text_display',
            content: `📌 **الحالية:** ${current ? current.name : 'غير محددة'}\n${description}`,
          },
          { type: 'separator', spacing: 'small' },
          {
            type: 'select',
            id: kind === 'mute' ? 'admin-mute-role' : 'admin-jail-role',
            placeholder: 'اختر الرتبة',
            options,
            minValues: 1,
            maxValues: 1,
          },
        ],
      },
    ],
  });
}

async function handleRoleSelect(
  ctx: PluginContext,
  interaction: PluginComponentInteraction,
  kind: 'mute' | 'jail',
): Promise<void> {
  try {
    const roleId = interaction.selectedValues?.[0] ?? '';
    if (!roleId) return;
    const settings = await getSettings(ctx);
    if (kind === 'mute') settings.muteRole = roleId;
    else settings.jailRole = roleId;
    await ctx.storage.set('settings', settings);
    const sec = await readSecurity(ctx);
    const protection = (sec.protection as Record<string, unknown> | undefined) ?? {};
    const actions = (protection.actions as Record<string, unknown> | undefined) ?? {};
    if (kind === 'mute') actions.mute_role = roleId;
    else actions.jail_role = roleId;
    protection.actions = actions;
    await writeSecurity(ctx, { ...sec, protection });
    await interaction.respond({ kind: 'update', message: await buildRoleMenu(ctx, kind) });
  } catch (error) {
    ctx.logger.error('admin role select error', { kind });
  }
}

// ---------- general & info commands ----------

async function handleSay(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage | void> {
  const content = optStringOrArg(inv, 'message');
  if (!content) return text('⛔ يرجى كتابة الرسالة التي تريد إرسالها');
  const channelId = resolveChannelId(inv) ?? inv.channelId;
  await ctx.messages.sendChannel(channelId, text(content));
  return undefined;
}

async function handlePing(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const user = await ctx.guild.fetchUser(inv.userId).catch(() => null);
  return text(`🏓 بونغ! شكراً **${user ? user.username : ''}**`);
}

async function handleHelp(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const prefix = settings.prefix || '!';
  const groups: Array<{ title: string; lines: string[] }> = [
    {
      title: '🛠️ أوامر الإدارة',
      lines: [
        `${prefix}say <رسالة> — إرسال رسالة`,
        `${prefix}clear <عدد> — حذف الرسائل`,
        `${prefix}lock / ${prefix}unlock — قفل/فتح القناة`,
        `${prefix}rename — إعادة تسمية قناة`,
        `${prefix}slowmode — وضع الكلام البطيء`,
        `${prefix}temp_role <عضو> <رتبة> <مدة> — رتبة مؤقتة`,
        `${prefix}ad / ${prefix}rr — إضافة/إزالة رتبة`,
      ],
    },
    {
      title: '⚖️ أوامر العقوبات',
      lines: [
        `${prefix}ban / ${prefix}unban / ${prefix}unban_all — الحظر ورفعه`,
        `${prefix}kick — الطرد`,
        `${prefix}mute / ${prefix}unmute — الكتم والكشف`,
        `${prefix}jail / ${prefix}unjail — السجن والإفراج`,
        `${prefix}warn / ${prefix}unwarn / ${prefix}warning — الإنذارات`,
      ],
    },
    {
      title: '⚙️ أوامر الإعدادات',
      lines: [
        `${prefix}prefix <بادئة> — تغيير البادئة`,
        `${prefix}setperm / setpermall / setpermreset — صلاحيات الأوامر`,
        `${prefix}sw — رتب الاستثناء`,
        `${prefix}arm / ${prefix}arj — رتب الميوت والسجن`,
        `${prefix}asrj — غرف السجن`,
        `${prefix}ac / al / ae — تخصيص الأوامر`,
        `${prefix}csname / cslogo / cscolor / cslog — إعدادات المحكمة`,
      ],
    },
    {
      title: '🛡️ أوامر الحماية',
      lines: [
        `${prefix}anti-ban / ${prefix}anti-kick — الحماية من الحظر والطرد`,
        `${prefix}anti-bot / ${prefix}anti-webhook — حماية البوتات والويب هوك`,
        `${prefix}anti-channel-create / anti-channel-delete — حماية القنوات`,
        `${prefix}anti-role-create / anti-role-delete — حماية الرتب`,
      ],
    },
    {
      title: 'ℹ️ أوامر المعلومات',
      lines: [
        `${prefix}ping — حالة البوت`,
        `${prefix}user / avatar / bu — معلومات المستخدم`,
        `${prefix}server / lg / bn — معلومات السيرفر`,
        `${prefix}roles — رتب السيرفر`,
        `${prefix}afk — وضع الابتعاد`,
        `${prefix}come — استدعاء مستخدم`,
      ],
    },
  ];
  const fields = groups.map((group) => ({
    name: group.title,
    value: group.lines.join('\n'),
    inline: false,
  }));
  return ctx.embeds.build({
    type: 'embed',
    title: '📜 قائمة أوامر الإدارة',
    description: `استخدم **${prefix}<الأمر>** أو أوامر الشرائح للإدارة.`,
    color: COLORS.info,
    fields,
    footer: buildFooter(settings),
  });
}

async function handleUser(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const resolved = await resolveUserId(ctx, inv, 'user');
  const userId = resolved?.userId ?? inv.userId;
  const user = await ctx.guild.fetchUser(userId).catch(() => null);
  if (!user) return text('⛔ لم يتم العثور على المستخدم');
  const member = await ctx.guild.fetchMember(userId).catch(() => null);
  const fields: Array<{ name: string; value: string; inline: boolean }> = [];
  fields.push({ name: '🧑‍💻 اسم المستخدم', value: `\`${user.username}\``, inline: true });
  if (user.discriminator) fields.push({ name: '🏷️ التمييز', value: `#${user.discriminator}`, inline: true });
  fields.push({ name: '🤖 بوت', value: user.isBot ? 'نعم' : 'لا', inline: true });
  if (user.createdAt) {
    fields.push({
      name: '📅 تاريخ إنشاء الحساب',
      value: `<t:${Math.floor(new Date(user.createdAt).getTime() / 1000)}:R>`,
      inline: false,
    });
  }
  if (member?.roleIds.length) fields.push({ name: '🎖️ عدد الرتب', value: String(member.roleIds.length), inline: true });
  return ctx.embeds.build({
    type: 'embed',
    title: `ℹ️ معلومات ${user.username}`,
    description: `<@${userId}>`,
    color: COLORS.info,
    thumbnailUrl: user.avatarUrl ?? undefined,
    imageUrl: user.bannerUrl ?? undefined,
    fields,
    footer: buildFooter(settings),
  });
}

async function handleServer(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const info = await ctx.guild.fetchGuildInfo().catch(() => null);
  if (!info) return text('⛔ تعذر جلب معلومات السيرفر');
  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: '👥 الأعضاء', value: String(info.memberCount ?? 0), inline: true },
    { name: '🚀 البوستات', value: String(info.boostCount ?? 0), inline: true },
    { name: '🏆 مستوى البوست', value: String(info.premiumTier ?? 0), inline: true },
  ];
  if (info.ownerId) fields.push({ name: '👑 المالك', value: `<@${info.ownerId}>`, inline: true });
  if (info.createdAt) {
    fields.push({
      name: '📅 تاريخ الإنشاء',
      value: `<t:${Math.floor(new Date(info.createdAt).getTime() / 1000)}:R>`,
      inline: false,
    });
  }
  if (info.description) fields.push({ name: '📝 الوصف', value: info.description, inline: false });
  return ctx.embeds.build({
    type: 'embed',
    title: `🏛️ ${info.name}`,
    color: COLORS.info,
    thumbnailUrl: info.iconUrl ?? undefined,
    imageUrl: info.bannerUrl ?? undefined,
    fields,
    footer: buildFooter(settings),
  });
}

async function handleRoles(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const roles = await ctx.guild.fetchRoles().catch(() => []);
  roles.sort((a, b) => b.position - a.position);
  const list = roles.slice(0, 30).map((role) => `<@&${role.id}> — موضع ${role.position}`).join('\n');
  return ctx.embeds.build({
    type: 'embed',
    title: '🎖️ رتب السيرفر',
    description: list || 'لا توجد رتب',
    color: COLORS.info,
    footer: buildFooter(settings),
  });
}

async function handleAvatar(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const resolved = await resolveUserId(ctx, inv, 'user');
  const userId = resolved?.userId ?? inv.userId;
  const user = await ctx.guild.fetchUser(userId).catch(() => null);
  if (!user) return text('⛔ لم يتم العثور على المستخدم');
  if (!user.avatarUrl) return text(`المستخدم **${user.username}** ليس لديه صورة رمزية`);
  return ctx.embeds.build({
    type: 'embed',
    title: `🖼️ صورة ${user.username}`,
    imageUrl: user.avatarUrl,
    color: COLORS.info,
    footer: buildFooter(settings),
  });
}

async function handleBannerServer(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const info = await ctx.guild.fetchGuildInfo().catch(() => null);
  if (!info?.bannerUrl) return text('⛔ هذا السيرفر ليس لديه بانر');
  return ctx.embeds.build({
    type: 'embed',
    title: `🏳️ بانر ${info.name}`,
    imageUrl: info.bannerUrl,
    color: COLORS.info,
    footer: buildFooter(settings),
  });
}

async function handleBannerUser(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const resolved = await resolveUserId(ctx, inv, 'user');
  const userId = resolved?.userId ?? inv.userId;
  const user = await ctx.guild.fetchUser(userId).catch(() => null);
  if (!user) return text('⛔ لم يتم العثور على المستخدم');
  if (!user.bannerUrl) return text(`المستخدم **${user.username}** ليس لديه بانر`);
  return ctx.embeds.build({
    type: 'embed',
    title: `🏳️ بانر ${user.username}`,
    imageUrl: user.bannerUrl,
    color: COLORS.info,
    footer: buildFooter(settings),
  });
}

async function handleLogoServer(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const info = await ctx.guild.fetchGuildInfo().catch(() => null);
  if (!info?.iconUrl) return text('⛔ هذا السيرفر ليس لديه شعار');
  return ctx.embeds.build({
    type: 'embed',
    title: `🖼️ شعار ${info.name}`,
    imageUrl: info.iconUrl,
    color: COLORS.info,
    footer: buildFooter(settings),
  });
}

async function handleAfk(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const afk = await getAfk(ctx);
  const existing = afk[inv.userId];
  if (existing) {
    delete afk[inv.userId];
    await saveAfk(ctx, afk);
    return text(`👋 أهلاً بعودتك! كنت بعيداً لمدة **${ageFromTimestamp(existing.timestamp)}**`);
  }
  const reason = optStringOrArg(inv, 'reason').trim() || 'بدون سبب';
  afk[inv.userId] = { reason, timestamp: new Date().toISOString() };
  await saveAfk(ctx, afk);
  return text(`🌙 تم تفعيل وضع الابتعاد. سبب الغياب: **${reason}**`);
}

// ---------- moderation commands ----------

async function handleBan(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const durationMs = parseDuration(optString(inv, 'duration'));
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const caseId = genCaseId();

  const banned = await ctx.guild.ban(resolved.userId, reason);
  if (!banned) return text('⛔ تعذر حظر المستخدم');
  if (durationMs) {
    ctx.scheduler.schedule(`unban:${resolved.userId}`, durationMs, () => {
      ctx.guild.unban(resolved.userId, 'انتهت مدة الحظر').catch(() => undefined);
    });
  }

  const user = await ctx.guild.fetchUser(resolved.userId).catch(() => null);
  const username = escapeUsername(user?.username ?? resolved.display);
  const duration = durationMs ? formatDuration(durationMs) : 'دائم';
  await addCase(ctx, resolved.userId, { username, tag: username, cases: [] }, {
    caseId,
    caseCount: 1,
    action: 'BAN',
    reason,
    moderatorId: inv.userId,
    moderator: mod,
    duration,
    durationMs: durationMs ?? 0,
    endTime: durationMs ? new Date(Date.now() + durationMs).toISOString() : null,
    court: settings.court.name,
    timestamp: new Date().toISOString(),
  });

  const card = await buildCard(ctx, 'ban', {
    title: '🔨 حظر',
    target: resolved.display,
    mod,
    reason,
    duration,
    caseInfo: caseId,
  });
  await logToChannel(ctx, settings, card);
  return card;
}

async function handleKick(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  if (resolved.userId === inv.userId) return text('⛔ لا يمكنك طرد نفسك');
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const caseId = genCaseId();

  const kicked = await ctx.guild.kick(resolved.userId, reason);
  if (!kicked) return text('⛔ تعذر طرد المستخدم');

  const user = await ctx.guild.fetchUser(resolved.userId).catch(() => null);
  const username = escapeUsername(user?.username ?? resolved.display);
  await addCase(ctx, resolved.userId, { username, tag: username, cases: [] }, {
    caseId,
    caseCount: 1,
    action: 'KICK',
    reason,
    moderatorId: inv.userId,
    moderator: mod,
    duration: '-',
    durationMs: 0,
    endTime: null,
    court: settings.court.name,
    timestamp: new Date().toISOString(),
  });

  const card = await buildCard(ctx, 'kick', {
    title: '👢 طرد',
    target: resolved.display,
    mod,
    reason,
    caseInfo: caseId,
  });
  await logToChannel(ctx, settings, card);
  return card;
}

async function handleMute(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const rawDuration = argOrOptString(inv, 'duration', 1);
  const durationMs = parseDuration(rawDuration);
  if (!durationMs) return text('⛔ صيغة المدة غير صحيحة (مثال: 10m، 2h، 1d)');
  const reason = optStringOrArg(inv, 'reason', 2).trim() || 'لم يتم تحديد سبب';
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const caseId = genCaseId();

  let muted = false;
  if (settings.muteRole) {
    muted = await ctx.guild.addRole(resolved.userId, settings.muteRole);
    if (muted) {
      ctx.scheduler.schedule(`unmute:${resolved.userId}`, durationMs, () => {
        ctx.guild.removeRole(resolved.userId, settings.muteRole).catch(() => undefined);
      });
    }
  }
  if (!muted) muted = await ctx.guild.timeout(resolved.userId, durationMs, reason);
  if (!muted) return text('⛔ تعذر كتم المستخدم');

  const duration = formatDuration(durationMs);
  const user = await ctx.guild.fetchUser(resolved.userId).catch(() => null);
  const username = escapeUsername(user?.username ?? resolved.display);
  await addCase(ctx, resolved.userId, { username, tag: username, cases: [] }, {
    caseId,
    caseCount: 1,
    action: 'MUTE',
    reason,
    moderatorId: inv.userId,
    moderator: mod,
    duration,
    durationMs,
    endTime: new Date(Date.now() + durationMs).toISOString(),
    court: settings.court.name,
    timestamp: new Date().toISOString(),
  });

  const card = await buildCard(ctx, 'mute', {
    title: '🔇 كتم',
    target: resolved.display,
    mod,
    reason,
    duration,
    caseInfo: caseId,
  });
  await logToChannel(ctx, settings, card);
  return card;
}

async function handleUnmute(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);

  let done = false;
  if (settings.muteRole) {
    const removed = await ctx.guild.removeRole(resolved.userId, settings.muteRole);
    if (removed) ctx.scheduler.cancel(`unmute:${resolved.userId}`);
    done = removed;
  }
  if (!done) done = await ctx.guild.timeout(resolved.userId, null, reason);
  if (!done) return text('⛔ تعذر رفع الكتم عن المستخدم');
  return buildCard(ctx, 'unmute', {
    title: '🔊 رفع الكتم',
    target: resolved.display,
    mod,
    reason,
  });
}

async function handleUnban(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const raw = argOrOptString(inv, 'user');
  const userId = raw ? stripMention(raw) : undefined;
  if (!userId) return text('⛔ يرجى تحديد معرف المستخدم');
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const unbanned = await ctx.guild.unban(userId, reason);
  if (!unbanned) return text('⛔ تعذر رفع الحظر (تأكد من صحة المعرف)');
  return buildCard(ctx, 'unban', {
    title: '✅ رفع الحظر',
    target: `\`${userId}\``,
    mod,
    reason,
  });
}

async function handleUnbanAll(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const records = await getRecords(ctx);
  const bannedUserIds = Object.entries(records)
    .filter(([, record]) => record.cases.some((entry) => entry.action === 'BAN'))
    .map(([userId]) => userId);
  if (bannedUserIds.length === 0) return text('لا توجد حظريات مسجلة لرفعها');
  let lifted = 0;
  for (const userId of bannedUserIds) {
    const done = await ctx.guild.unban(userId, 'رفع جميع الحظريات').catch(() => false);
    if (done) lifted += 1;
  }
  return text(`✅ تم رفع **${lifted}** حظر من أصل **${bannedUserIds.length}**`);
}

async function releaseJail(ctx: PluginContext, userId: string, reason: string): Promise<boolean> {
  const jailedMap = await getJailed(ctx);
  const entry = jailedMap[userId];
  if (!entry) return false;
  const settings = await getSettings(ctx);
  const current = await ctx.guild.fetchMember(userId).catch(() => null);
  const roles = entry.originalRoles.length > 0
    ? entry.originalRoles
    : (current?.roleIds ?? []).filter((roleId) => roleId !== settings.jailRole);
  await ctx.guild.setRoles(userId, roles).catch(() => undefined);
  for (const channelId of settings.jailShowRoom) {
    await ctx.channels.setPermissions(channelId, [], `إفراج المستخدم ${userId}`).catch(() => undefined);
  }
  ctx.scheduler.cancel(`unjail:${userId}`);
  delete jailedMap[userId];
  await saveJailed(ctx, jailedMap);
  const card = await buildCard(ctx, 'unjail', {
    title: '🔓 إفراج',
    target: `<@${userId}>`,
    mod: 'النظام',
    reason,
  });
  await logToChannel(ctx, settings, card);
  return true;
}

async function handleJail(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const durationMs = parseDuration(argOrOptString(inv, 'duration', 2));
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  if (!settings.jailRole) return text('⛔ لم يتم تحديد رتبة السجن (استخدم actions_role_jail)');

  const member = await ctx.guild.fetchMember(resolved.userId).catch(() => null);
  const originalRoles = (member?.roleIds ?? []).filter((roleId) => roleId !== settings.jailRole);

  const jailed = await ctx.guild.setRoles(resolved.userId, [settings.jailRole]);
  if (!jailed) return text('⛔ تعذر سجن المستخدم');

  const allowBits = PERM_VIEW_CHANNEL | PERM_SEND_MESSAGES | PERM_READ_MESSAGE_HISTORY;
  for (const channelId of settings.jailShowRoom) {
    await ctx.channels
      .setPermissions(channelId, [
        { id: settings.jailRole, type: 'role', allow: allowBits, deny: 0 },
        { id: resolved.userId, type: 'member', allow: allowBits, deny: 0 },
      ], `سجن المستخدم ${resolved.userId}`)
      .catch(() => undefined);
  }

  if (durationMs) {
    ctx.scheduler.schedule(`unjail:${resolved.userId}`, durationMs, () => {
      releaseJail(ctx, resolved.userId, 'انتهت مدة السجن').catch(() => undefined);
    });
  }

  const caseId = genCaseId();
  const now = new Date().toISOString();
  const jailedMap = await getJailed(ctx);
  jailedMap[resolved.userId] = {
    userId: resolved.userId,
    caseId,
    reason,
    moderatorId: inv.userId,
    originalRoles,
    jailedAt: now,
    jailEnd: durationMs ? new Date(Date.now() + durationMs).toISOString() : null,
    jailDurationMs: durationMs ?? null,
  };
  await saveJailed(ctx, jailedMap);

  const user = await ctx.guild.fetchUser(resolved.userId).catch(() => null);
  const username = escapeUsername(user?.username ?? resolved.display);
  const duration = durationMs ? formatDuration(durationMs) : 'دائم';
  await addCase(ctx, resolved.userId, { username, tag: username, cases: [] }, {
    caseId,
    caseCount: 1,
    action: 'JAIL',
    reason,
    moderatorId: inv.userId,
    moderator: mod,
    duration,
    durationMs: durationMs ?? 0,
    endTime: durationMs ? new Date(Date.now() + durationMs).toISOString() : null,
    court: settings.court.name,
    timestamp: now,
  });

  const card = await buildCard(ctx, 'jail', {
    title: '🔒 سجن',
    target: resolved.display,
    mod,
    reason,
    duration,
    caseInfo: caseId,
  });
  await logToChannel(ctx, settings, card);
  return card;
}

async function handleUnjail(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const released = await releaseJail(ctx, resolved.userId, reason);
  if (!released) return text('⛔ هذا المستخدم ليس مسجوناً');
  const mod = await userDisplay(ctx, inv.userId);
  return buildCard(ctx, 'unjail', {
    title: '🔓 إفراج',
    target: resolved.display,
    mod,
    reason,
  });
}

async function handleWarn(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const caseId = genCaseId();

  const user = await ctx.guild.fetchUser(resolved.userId).catch(() => null);
  const username = escapeUsername(user?.username ?? resolved.display);
  const records = await getRecords(ctx);
  const record = records[resolved.userId] ?? { username, tag: username, cases: [] };
  const caseCount = record.cases.length + 1;
  await addCase(ctx, resolved.userId, record, {
    caseId,
    caseCount,
    action: 'WARN',
    reason,
    moderatorId: inv.userId,
    moderator: mod,
    duration: '-',
    durationMs: 0,
    endTime: null,
    court: settings.court.name,
    timestamp: new Date().toISOString(),
  });

  const card = await buildCard(ctx, 'warn', {
    title: `⚠️ إنذار (#${caseCount})`,
    target: resolved.display,
    mod,
    reason,
    caseInfo: caseId,
  });
  await logToChannel(ctx, settings, card);
  return card;
}

async function handleUnwarn(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const caseId = optStringOrArg(inv, 'case').trim().toUpperCase();
  if (!caseId) return text('⛔ يرجى تحديد معرّف الإنذار');
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const removed = await removeCase(ctx, resolved.userId, caseId);
  if (!removed) return text('⛔ لا يوجد إنذار بهذا المعرّف');
  return buildCard(ctx, 'unwarn', {
    title: '✅ حذف الإنذار',
    target: resolved.display,
    mod,
    reason: `معرّف الإنذار: ${caseId}`,
    caseInfo: caseId,
  });
}

async function handleWarning(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const resolved = await resolveUserId(ctx, inv, 'user');
  const userId = resolved?.userId ?? inv.userId;
  const records = await getRecords(ctx);
  const record = records[userId];
  const warnings = (record?.cases ?? []).filter((entry) => entry.action === 'WARN');
  if (warnings.length === 0) return text('لا توجد إنذارات لهذا المستخدم');
  const fields = warnings.slice(0, 25).map((entry) => ({
    name: `🔖 ${entry.caseId} — #${entry.caseCount}`,
    value: `**السبب:** ${entry.reason}\n**بواسطة:** ${entry.moderator}\n**التاريخ:** <t:${Math.floor(new Date(entry.timestamp).getTime() / 1000)}:R>`,
    inline: false,
  }));
  return ctx.embeds.build({
    type: 'embed',
    title: `⚠️ إنذارات ${record?.username ?? resolved?.display ?? ''}`,
    description: `عدد الإنذارات: **${warnings.length}**`,
    fields,
    color: COLORS.warn,
    footer: buildFooter(settings),
  });
}

async function handleClear(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const rawCount = optNum(inv, 'amount');
  let amount = 0;
  if (typeof rawCount === 'number') amount = Math.floor(rawCount);
  else {
    const arg = inv.args[0];
    if (arg) {
      const parsed = parseInt(arg, 10);
      if (Number.isFinite(parsed)) amount = Math.max(1, parsed);
    }
  }
  if (amount <= 0) return text('⛔ يرجى تحديد عدد الرسائل المراد حذفها');
  amount = Math.min(100, amount);
  const channelId = resolveChannelId(inv, amount.toString() === inv.args[0] ? 1 : 0) ?? inv.channelId;
  const messages = await ctx.messages.readChannel(channelId, amount).catch(() => []);
  const cutoff = Date.now() - 14 * 86_400_000;
  const deletable = messages.filter((entry) => {
    const sentAt = entry.sentAt ? new Date(entry.sentAt).getTime() : Date.now();
    return !Number.isNaN(sentAt) && sentAt >= cutoff;
  });
  for (const entry of deletable) {
    await ctx.messages.delete(channelId, entry.id).catch(() => undefined);
  }
  if (deletable.length > 0 && settings.court.logChannel) {
    await logToChannel(ctx, settings, await buildCard(ctx, 'clear', {
      title: '🧹 تنظيف',
      mod,
      target: `<#${channelId}>`,
      reason: `تم حذف **${deletable.length}** رسالة`,
    }));
  }
  return text(`✅ تم حذف **${deletable.length}** رسالة من <#${channelId}>`);
}

// ---------- command name/alias table ----------

const COMMAND_NAMES: Record<string, { name: string; aliases: string[] }> = {
  ping: { name: 'ping', aliases: [] },
  help: { name: 'help', aliases: [] },
  user: { name: 'user', aliases: [] },
  server: { name: 'server', aliases: [] },
  roles: { name: 'roles', aliases: [] },
  avatar: { name: 'avatar', aliases: [] },
  banner_server: { name: 'banner', aliases: ['bn'] },
  banner_user: { name: 'userbanner', aliases: ['bu'] },
  logo_server: { name: 'logo', aliases: ['lg'] },
  afk: { name: 'afk', aliases: [] },
  say: { name: 'say', aliases: [] },
  ban: { name: 'ban', aliases: [] },
  kick: { name: 'kick', aliases: [] },
  mute: { name: 'mute', aliases: [] },
  unmute: { name: 'unmute', aliases: [] },
  unban: { name: 'unban', aliases: [] },
  unban_all: { name: 'unban_all', aliases: [] },
  jail: { name: 'jail', aliases: [] },
  unjail: { name: 'unjail', aliases: [] },
  warn: { name: 'warn', aliases: [] },
  unwarn: { name: 'unwarn', aliases: [] },
  warning: { name: 'warning', aliases: [] },
  clear: { name: 'clear', aliases: [] },
  lock: { name: 'lock', aliases: [] },
  unlock: { name: 'unlock', aliases: [] },
  slowmode: { name: 'slowmode', aliases: [] },
  rename: { name: 'rename', aliases: [] },
  temp_role: { name: 'temp_role', aliases: [] },
  add_role: { name: 'add_role', aliases: ['ad'] },
  remove_role: { name: 'remove_role', aliases: ['rr'] },
  multi_role: { name: 'multi_role', aliases: ['mr'] },
  auto_role: { name: 'auto_role', aliases: ['ar'] },
  set_prefix: { name: 'prefix', aliases: ['set_prefix'] },
  set_perm: { name: 'setperm', aliases: ['set_perm'] },
  set_perm_all: { name: 'setpermall', aliases: ['set_perm_all'] },
  set_perm_reset: { name: 'setpermreset', aliases: ['set_perm_reset'] },
  set_whitelist: { name: 'sw', aliases: ['set_whitelist'] },
  actions_role_mute: { name: 'actions_role_mute', aliases: ['arm'] },
  actions_role_jail: { name: 'actions_role_jail', aliases: ['arj'] },
  actions_show_room_jail: { name: 'actions_show_room_jail', aliases: ['asrj'] },
  actions_color: { name: 'actions_color', aliases: ['ac'] },
  actions_label: { name: 'actions_label', aliases: ['al'] },
  actions_enabled: { name: 'actions_enabled', aliases: ['ae'] },
  actions_log: { name: 'actions_log', aliases: ['alog'] },
  court_set_name: { name: 'court_set_name', aliases: ['csname'] },
  court_set_color: { name: 'court_set_color', aliases: ['cscolor'] },
  court_set_logo: { name: 'court_set_logo', aliases: ['cslogo'] },
  court_set_log: { name: 'court_set_log', aliases: ['cslog'] },
  anti_ban: { name: 'antiban', aliases: ['anti-ban', 'anti_ban'] },
  anti_kick: { name: 'antikick', aliases: ['anti-kick', 'anti_kick'] },
  anti_bots: { name: 'antibot', aliases: ['anti-bot', 'anti_bots'] },
  anti_webhooks: { name: 'antiwebhook', aliases: ['anti-webhook', 'anti_webhooks'] },
  anti_channel_create: { name: 'antichcreate', aliases: ['anti-channel-create', 'anti_channel_create'] },
  anti_channel_delete: { name: 'antichdelete', aliases: ['anti-channel-delete', 'anti_channel_delete'] },
  anti_role_create: { name: 'antirolecreate', aliases: ['anti-role-create', 'anti_role_create'] },
  anti_role_delete: { name: 'antiroledelete', aliases: ['anti-role-delete', 'anti_role_delete'] },
  anti_role_add: { name: 'antiroleadd', aliases: ['anti-role-add', 'anti_role_add'] },
};

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  ping: 'حالة البوت',
  help: 'قائمة الأوامر',
  user: 'معلومات عن مستخدم',
  server: 'معلومات عن السيرفر',
  roles: 'عرض رتب السيرفر',
  avatar: 'عرض صورة المستخدم',
  banner_server: 'بانر السيرفر',
  banner_user: 'بانر المستخدم',
  logo_server: 'شعار السيرفر',
  afk: 'وضع الابتعاد',
  say: 'إرسال رسالة للقناة',
  ban: 'حظر عضو',
  kick: 'طرد عضو',
  mute: 'كتم عضو',
  unmute: 'رفع الكتم عن عضو',
  unban: 'رفع الحظر عن عضو',
  unban_all: 'رفع جميع الحظريات',
  jail: 'سجن عضو',
  unjail: 'إفراج عضو من السجن',
  warn: 'توجيه إنذار',
  unwarn: 'حذف إنذار',
  warning: 'عرض إنذارات المستخدم',
  clear: 'حذف الرسائل',
  lock: 'قفل القناة',
  unlock: 'فتح القناة',
  slowmode: 'ضبط وضع الكلام البطيء',
  rename: 'إعادة تسمية القناة',
  temp_role: 'إعطاء رتبة مؤقتة',
  add_role: 'إضافة رتبة لعضو',
  remove_role: 'إزالة رتبة من عضو',
  multi_role: 'تعديل رتبة لجميع الأعضاء',
  auto_role: 'رتبة الترحيب التلقائية',
  come: 'استدعاء مستخدم إلى الخاص',
  set_prefix: 'تغيير بادئة الأوامر',
  set_perm: 'منح رتبة صلاحية أمر',
  set_perm_all: 'منح رتبة صلاحية جميع الأوامر',
  set_perm_reset: 'إعادة تعيين صلاحيات الأوامر',
  set_whitelist: 'إدارة رتب الاستثناء',
  actions_role_mute: 'تحديد رتبة الميوت',
  actions_role_jail: 'تحديد رتبة السجن',
  actions_show_room_jail: 'إدارة غرف السجن',
  actions_color: 'تغيير لون بطاقة أمر',
  actions_label: 'تغيير اسم/تسمية أمر',
  actions_enabled: 'تفعيل أو تعطيل أمر',
  actions_log: 'تحديد قناة السجلات',
  court_set_name: 'تغيير اسم المحكمة',
  court_set_color: 'تغيير لون المحكمة',
  court_set_logo: 'تغيير شعار المحكمة',
  court_set_log: 'تحديد قناة سجلات المحكمة',
  anti_ban: 'إعدادات الحماية من الحظر',
  anti_kick: 'إعدادات الحماية من الطرد',
  anti_bots: 'الحماية من البوتات',
  anti_webhooks: 'الحماية من الويب هوك',
  anti_channel_create: 'الحماية من إنشاء القنوات',
  anti_channel_delete: 'الحماية من حذف القنوات',
  anti_role_create: 'الحماية من إنشاء الرتب',
  anti_role_delete: 'الحماية من حذف الرتب',
  anti_role_add: 'الحماية من إضافة الرتب',
};

function findCommand(input: string): string | null {
  const normalized = input.replace(/^[!/]+/g, '').trim().toLowerCase();
  for (const [commandId, meta] of Object.entries(COMMAND_NAMES)) {
    if (commandId === normalized || meta.name === normalized || meta.aliases.includes(normalized)) {
      return commandId;
    }
  }
  return null;
}

// ---------- channel commands ----------

async function handleLock(ctx: PluginContext, inv: CommandInvocation, locked: boolean): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const channelId = resolveChannelId(inv) ?? inv.channelId;
  const reason = optStringOrArg(inv, 'reason', locked ? 1 : 1).trim() || 'لم يتم تحديد سبب';
  await ctx.channels.setPermissions(
    channelId,
    [{ id: inv.guildId, type: 'role', allow: 0, deny: locked ? PERM_SEND_MESSAGES : 0 }],
    reason,
  ).catch(() => undefined);
  const card = await buildCard(ctx, locked ? 'lock' : 'unlock', {
    title: locked ? '🔒 قفل القناة' : '🔓 فتح القناة',
    target: `<#${channelId}>`,
    mod,
    reason,
  });
  await ctx.messages.sendChannel(channelId, card).catch(() => undefined);
  await logToChannel(ctx, settings, card);
  return card;
}

async function handleSlowmode(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const channelId = resolveChannelId(inv, 1) ?? inv.channelId;
  let seconds = 0;
  const rawNum = optNum(inv, 'seconds');
  if (typeof rawNum === 'number') seconds = rawNum;
  else {
    const arg = inv.args[0];
    if (arg) seconds = parseInt(arg, 10);
  }
  if (Number.isNaN(seconds) || seconds < 0 || seconds > 21_600) {
    return text('⛔ المدة يجب أن تكون بين 0 و 21600 ثانية');
  }
  await ctx.channels.setSlowmode(channelId, seconds).catch(() => undefined);
  return buildCard(ctx, 'slowmode', {
    title: '🐢 وضع الكلام البطيء',
    target: `<#${channelId}>`,
    mod,
    reason: seconds === 0 ? 'تم إيقاف الوضع' : `ثانية واحدة كل ${seconds} ثانية`,
  });
}

async function handleRename(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const channelId = resolveChannelId(inv, 1) ?? inv.channelId;
  const rawName = optString(inv, 'name');
  const name = (rawName ?? inv.args[0] ?? '').trim();
  if (!name) return text('⛔ يرجى تحديد الاسم الجديد');
  await ctx.channels.rename(channelId, name.slice(0, 100)).catch(() => undefined);
  return buildCard(ctx, 'rename', {
    title: '✏️ إعادة تسمية القناة',
    target: `<#${channelId}>`,
    mod,
    reason: `الاسم الجديد: **${name}**`,
  });
}

// ---------- role commands ----------

async function handleAddRemoveRole(
  ctx: PluginContext,
  inv: CommandInvocation,
  adding: boolean,
): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const roleRaw = argOrOptString(inv, 'role', 1);
  const roleId = roleRaw ? stripMention(roleRaw) : undefined;
  if (!roleId) return text('⛔ يرجى تحديد الرتبة');
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const roleName = await roleDisplay(ctx, roleId);
  const done = adding
    ? await ctx.guild.addRole(resolved.userId, roleId)
    : await ctx.guild.removeRole(resolved.userId, roleId);
  if (!done) return text('⛔ تعذر تعديل الرتبة على هذا المستخدم');
  return buildCard(ctx, adding ? 'add_role' : 'remove_role', {
    title: adding ? '➕ إضافة رتبة' : '➖ إزالة رتبة',
    target: resolved.display,
    mod,
    reason: `الرتبة: **${roleName}**`,
  });
}

async function handleMultiRole(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const action = (optString(inv, 'action') ?? inv.args[0] ?? '').toLowerCase().trim();
  const roleRaw = inv.args[1] ? stripMention(inv.args[1]) : optString(inv, 'role');
  if (!(action === 'add' || action === 'remove') || !roleRaw) {
    return text('⛔ الاستخدام الصحيح: الملف!mr <add|remove> <رتبة>');
  }
  const members = await getMembers(ctx);
  const ids = Object.keys(members);
  if (ids.length === 0) return text('⚠️ لا توجد بيانات أعضاء متاحة (يتم التحديث تلقائياً عند دخول الأعضاء)');
  let changed = 0;
  for (const userId of ids) {
    const done = action === 'add'
      ? await ctx.guild.addRole(userId, roleRaw).catch(() => false)
      : await ctx.guild.removeRole(userId, roleRaw).catch(() => false);
    if (done) changed += 1;
  }
  const roleName = await roleDisplay(ctx, roleRaw);
  return buildCard(ctx, 'multi_role', {
    title: action === 'add' ? '➕ إضافة رتبة للجميع' : '➖ إزالة رتبة من الجميع',
    mod,
    reason: `الرتبة: **${roleName}** — تم التعديل على **${changed}** عضواً من **${ids.length}**`,
  });
}

async function handleAutoRole(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const roleRaw = argOrOptString(inv, 'role');
  if (roleRaw) {
    const roleId = stripMention(roleRaw);
    if (!roleId) return text('⛔ يرجى تحديد الرتبة');
    settings.autoRole = roleId;
    await ctx.storage.set('settings', settings);
    await patchCommand(ctx, 'auto_role', { enabled: true });
    return buildCard(ctx, 'auto_role', {
      title: '🎁 رتبة الترحيب التلقائية',
      mod,
      reason: `الرتبة: **${await roleDisplay(ctx, roleId)}** — ستمنح للعضو الجديد تلقائياً`,
    });
  }
  if (!settings.autoRole) return text('لا توجد رتبة ترحيب محددة حالياً');
  const roleName = await roleDisplay(ctx, settings.autoRole);
  return ctx.embeds.build({
    type: 'embed',
    title: '🎁 رتبة الترحيب التلقائية',
    description: `الرتبة الحالية: **${roleName}**\nتُعطى للعضو الجديد عند دخوله السيرفر.`,
    color: COLORS.info,
    footer: buildFooter(settings),
  });
}

async function handleTempRole(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  const roleRaw = argOrOptString(inv, 'role', 1);
  const roleId = roleRaw ? stripMention(roleRaw) : undefined;
  if (!roleId) return text('⛔ يرجى تحديد الرتبة');
  const durationMs = parseDuration(argOrOptString(inv, 'duration', 2));
  if (!durationMs) return text('⛔ صيغة المدة غير صحيحة (مثال: 10m، 2h، 1d)');
  const settings = await getSettings(ctx);
  const mod = await userDisplay(ctx, inv.userId);
  const added = await ctx.guild.addRole(resolved.userId, roleId);
  if (!added) return text('⛔ تعذر إعطاء الرتبة المؤقتة');
  ctx.scheduler.schedule(`temprole:${resolved.userId}:${roleId}`, durationMs, () => {
    ctx.guild.removeRole(resolved.userId, roleId).catch(() => undefined);
  });
  return buildCard(ctx, 'temp_role', {
    title: '⏳ رتبة مؤقتة',
    target: resolved.display,
    mod,
    reason: `الرتبة: **${await roleDisplay(ctx, roleId)}**`,
    duration: formatDuration(durationMs),
  });
}

async function handleCome(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const resolved = await resolveUserId(ctx, inv, 'user');
  if (!resolved) return text('⛔ يرجى تحديد المستخدم');
  if (resolved.userId === inv.userId) return text('⛔ لا يمكنك استدعاء نفسك');
  const reason = optStringOrArg(inv, 'reason', 1).trim() || 'لم يتم تحديد سبب';
  const settings = await getSettings(ctx);
  const guildInfo = await ctx.guild.fetchGuildInfo().catch(() => null);
  const mod = await userDisplay(ctx, inv.userId);
  const date = new Date().toLocaleString('en-US');
  const color = parseHexColor(settings.court.color);
  const card = ctx.embeds.build({
    type: 'embed',
    title: `⚠️ استدعاء من إدارة ${guildInfo?.name ?? ''}`,
    description: `لقد تم استدعاؤك من قبل إدارة السيرفر`,
    color,
    fields: [
      { name: '👤 المسؤول', value: mod, inline: true },
      { name: '🏛️ المحكمة', value: settings.court.name || '-', inline: true },
      { name: '📝 السبب', value: reason, inline: false },
      { name: '🕐 التاريخ', value: date, inline: false },
    ],
    thumbnailUrl: guildInfo?.iconUrl ?? undefined,
    footer: buildFooter(settings),
  });
  const dmSent = await ctx.messages.sendDirect(resolved.userId, card).catch(() => null);
  if (!dmSent) return text('⛔ تعذر إرسال رسالة خاصة للمستخدم (قد يكون أغلق الرسائل الخاصة)');
  return text(`📨 تم إرسال استدعاء إلى ${resolved.display}\nالسبب: ${reason}`);
}

// ---------- config commands ----------

async function handleSetPrefix(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const prefix = (optString(inv, 'prefix') ?? inv.args[0] ?? '').trim();
  if (!prefix || prefix.length > 3) return text('⛔ البادئة يجب أن تكون حرفاً واحداً على الأقل (3 أحرف كحد أقصى)');
  settings.prefix = prefix;
  await ctx.storage.set('settings', settings);
  return text(`✅ تم تغيير بادئة الأوامر إلى **${prefix}**`);
}

async function handleSetPerm(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const commandInput = optString(inv, 'command') ?? inv.args[0] ?? '';
  const roleRaw = inv.args[1] ? stripMention(inv.args[1]) : optString(inv, 'role');
  if (!roleRaw) return text('⛔ يرجى تحديد الرتبة');
  const commandId = findCommand(commandInput);
  if (!commandId) return text('⛔ الأمر غير موجود');
  await patchCommand(ctx, commandId, { allowedRoles: [roleRaw], requireAdministrator: false });
  return text(`✅ تم منح رتبة **${await roleDisplay(ctx, roleRaw)}** صلاحية أمر **${COMMAND_NAMES[commandId]?.name ?? commandId}**`);
}

async function handleSetPermAll(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const roleRaw = inv.args[0] ? stripMention(inv.args[0]) : optString(inv, 'role');
  if (!roleRaw) return text('⛔ يرجى تحديد الرتبة');
  for (const commandId of ALL_COMMAND_IDS) {
    await patchCommand(ctx, commandId, { allowedRoles: [roleRaw] });
  }
  return text(`✅ تم منح رتبة **${await roleDisplay(ctx, roleRaw)}** صلاحية **${ALL_COMMAND_IDS.length}** أمر`);
}

async function handleSetPermReset(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  for (const commandId of ALL_COMMAND_IDS) {
    await patchCommand(ctx, commandId, { allowedRoles: [], requireAdministrator: false });
  }
  return text(`✅ تم إعادة تعيين صلاحيات **${ALL_COMMAND_IDS.length}** أمر`);
}

async function handleSetWhitelist(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const roleRaw = inv.args[0] ? stripMention(inv.args[0]) : optString(inv, 'role');
  if (!roleRaw) return text('⛔ يرجى تحديد الرتبة');
  const removing = optBool(inv, 'remove') ?? inv.args.includes('remove');
  const settings = await getSettings(ctx);
  const existing = settings.whitelistRoles ?? [];
  if (removing) {
    settings.whitelistRoles = existing.filter((id) => id !== roleRaw);
  } else if (!existing.includes(roleRaw)) {
    settings.whitelistRoles = [...existing, roleRaw];
  }
  await ctx.storage.set('settings', settings);
  const sec = await readSecurity(ctx);
  const protection = (sec.protection as Record<string, unknown> | undefined) ?? {};
  const whitelistRoles = settings.whitelistRoles;
  const userPermissions = settings.userPermissions;
  await writeSecurity(ctx, {
    ...sec,
    protection: { ...protection, whitelist_roles: whitelistRoles.join('\n'), user_permissions: userPermissions.join(',') },
  });
  return text(
    `✅ تم ${removing ? 'إزالة' : 'إضافة'} رتبة **${await roleDisplay(ctx, roleRaw)}** ${removing ? 'من' : 'إلى'} قائمة الاستثناء\n📋 العدد الحالي: **${settings.whitelistRoles.length}**`,
  );
}

async function handleActionsLog(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const channelId = resolveChannelId(inv) ?? inv.channelId;
  if (!channelId) return text('⛔ يرجى تحديد القناة');
  const settings = await getSettings(ctx);
  settings.court.logChannel = channelId;
  await ctx.storage.set('settings', settings);
  const sec = await readSecurity(ctx);
  await writeSecurity(ctx, { ...sec, security: { ...((sec.security as Record<string, unknown>) ?? {}), channelId } });
  return text(`✅ تم تعيين قناة السجلات إلى <#${channelId}>`);
}

async function handleActionsColor(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const commandInput = optString(inv, 'command') ?? inv.args[0] ?? '';
  const rawColor = (optString(inv, 'color') ?? inv.args[1] ?? '').replace('#', '').trim();
  const commandId = findCommand(commandInput);
  if (!commandId) return text('⛔ الأمر غير موجود');
  if (!/^[0-9a-fA-F]{6}$/.test(rawColor)) return text('⛔ اللون يجب أن يكون بصيغة HEX (مثال: FF0000)');
  await saveActionMeta(ctx, commandId, { color: `#${rawColor}` });
  return text(`✅ تم تغيير لون بطاقة أمر **${COMMAND_NAMES[commandId]?.name ?? commandId}** إلى \`#${rawColor}\``);
}

async function handleActionsLabel(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const commandInput = optString(inv, 'command') ?? inv.args[0] ?? '';
  const label = (optString(inv, 'label') ?? inv.args[1] ?? '').trim();
  const commandId = findCommand(commandInput);
  if (!commandId) return text('⛔ الأمر غير موجود');
  if (!label) return text('⛔ يرجى تحديد التسمية الجديدة');
  await saveActionMeta(ctx, commandId, { label });
  return text(`✅ تم تغيير تسمية أمر **${COMMAND_NAMES[commandId]?.name ?? commandId}** إلى **${label}**`);
}

async function handleActionsEnabled(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const commandInput = optString(inv, 'command') ?? inv.args[0] ?? '';
  const commandId = findCommand(commandInput);
  if (!commandId) return text('⛔ الأمر غير موجود');
  let enabled = optBool(inv, 'enabled');
  if (enabled === undefined) {
    const arg = inv.args[1]?.toLowerCase();
    if (arg === 'on' || arg === 'enabled' || arg === 'تفعيل') enabled = true;
    else if (arg === 'off' || arg === 'disabled' || arg === 'تعطيل') enabled = false;
    else return text('⛔ يرجى تحديد الحالة (on/off)');
  }
  await patchCommand(ctx, commandId, { enabled });
  await saveActionMeta(ctx, commandId, { enabled });
  const stateMessage = enabled ? 'تم التفعيل ✅' : 'تم التعطيل ❌';
  return text(`**${COMMAND_NAMES[commandId]?.name ?? commandId}** — ${stateMessage}`);
}

// ---------- court commands ----------

async function handleCourtSet(ctx: PluginContext, inv: CommandInvocation, field: 'name' | 'color' | 'logo'): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const value = (optString(inv, field) ?? inv.args[0] ?? '').trim();
  if (!value) return text('⛔ يرجى تحديد القيمة الجديدة');
  if (field === 'color') {
    const hex = value.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return text('⛔ اللون يجب أن يكون بصيغة HEX (مثال: FF0000)');
    settings.court.color = `#${hex}`;
  } else if (field === 'logo') {
    if (!/^https?:\/\//i.test(value)) return text('⛔ الرابط يجب أن يبدأ بـ http/https');
    settings.court.logo = value;
  } else {
    settings.court.name = value.slice(0, 100);
  }
  await ctx.storage.set('settings', settings);
  const labels: Record<string, string> = { name: 'اسم المحكمة', color: 'لون المحكمة', logo: 'شعار المحكمة' };
  return text(`✅ تم تغيير **${labels[field]}** إلى **${value}**`);
}

async function handleCourtSetLog(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const channelId = resolveChannelId(inv) ?? inv.channelId;
  if (!channelId) return text('⛔ يرجى تحديد القناة');
  const settings = await getSettings(ctx);
  settings.court.logChannel = channelId;
  await ctx.storage.set('settings', settings);
  return text(`✅ تم تعيين قناة سجلات المحكمة إلى <#${channelId}>`);
}

// ---------- protection commands ----------

function actionLabel(action: string): string {
  switch (action) {
    case '1': return 'طرد العضو';
    case '2': return 'إزالة كل الرتب';
    case '3': return 'حظر العضو';
    case '4': return 'إعطاء رتبة الميوت';
    case '5': return 'إعطاء رتبة السجن';
    default: return action;
  }
}

function protectionStatusEmbed(
  ctx: PluginContext,
  featureName: string,
  config: { enabled: boolean; limit?: number; action?: string },
): CoreMessage {
  const arState = config.enabled ? '🟢 **مفعل**' : '🔴 **معطل**';
  const parts = [`**${featureName}**\n${arState}`];
  if (config.limit !== undefined) parts.push(`🎯 **الحد:** ${config.limit} | **Limit:** ${config.limit}`);
  if (config.action) parts.push(`⚙️ **الإجراء:** ${actionLabel(config.action)} | **Action:** ${config.action}`);
  return ctx.embeds.build({
    type: 'embed',
    title: '🛡️ إعدادات الحماية | Protection Settings',
    description: parts.join('\n'),
    color: config.enabled ? COLORS.success : COLORS.bad,
  });
}

async function syncProtectionToSecurity(ctx: PluginContext, protection: ProtectionSettings): Promise<void> {
  const sec = await readSecurity(ctx);
  const oldProtection = (sec.protection as Record<string, unknown> | undefined) ?? {};
  await writeSecurity(ctx, {
    ...sec,
    protection: {
      ...oldProtection,
      anti_ban: protection.anti_ban,
      anti_kick: protection.anti_kick,
      anti_bots: protection.anti_bots,
      anti_webhooks: protection.anti_webhooks,
      anti_channel_create: protection.anti_channel_create,
      anti_channel_delete: protection.anti_channel_delete,
      anti_role_create: protection.anti_role_create,
      anti_role_delete: protection.anti_role_delete,
      anti_role_add: protection.anti_role_add,
    },
  });
}

function makeAntiHandler(
  ctx: PluginContext,
  feature: keyof ProtectionSettings,
): (_ctx: PluginContext, inv: CommandInvocation) => Promise<CoreMessage> {
  return async (_ctx: PluginContext, inv: CommandInvocation) => {
    const protection = await getProtection(ctx);
    const config = protection[feature] as { enabled: boolean; limit?: number; action?: string };
    const featureName = COMMAND_NAMES[feature]?.name ?? feature;
    const hasLimit = feature !== 'anti_bots' && feature !== 'anti_webhooks';

    const rawEnabled = optBool(inv, 'enabled');
    const rawLimit = optNum(inv, 'limit');
    const rawAction = optString(inv, 'action');

    let changed = false;
    if (rawEnabled !== undefined) {
      config.enabled = rawEnabled;
      changed = true;
    }
    if (rawLimit !== undefined && hasLimit) {
      const limit = Math.min(20, Math.max(1, Math.floor(rawLimit)));
      config.limit = limit;
      changed = true;
    }
    if (rawAction !== undefined) {
      const action = rawAction.trim() as string;
      if (/^[1-5]$/.test(action)) {
        config.action = action;
        changed = true;
      }
    }

    if (changed) {
      await ctx.storage.set('protection', protection);
      await syncProtectionToSecurity(ctx, protection);
      return protectionStatusEmbed(ctx, featureName, config);
    }

    if (inv.args.length > 0) {
      const arg = (inv.args[0] ?? '').toLowerCase();
      if (arg === 'on' || arg === 'enable') config.enabled = true;
      else if (arg === 'off' || arg === 'disable') config.enabled = false;
      else if (hasLimit && /^\d+$/.test(arg)) config.limit = Math.min(20, Math.max(1, parseInt(arg, 10)));
      else if (/^[1-5]$/.test(arg)) config.action = arg;
      else return protectionStatusEmbed(ctx, featureName, config);
      await ctx.storage.set('protection', protection);
      await syncProtectionToSecurity(ctx, protection);
      return protectionStatusEmbed(ctx, featureName, config);
    }

    return protectionStatusEmbed(ctx, featureName, config);
  };
}

async function handleShowRoomJail(ctx: PluginContext, inv: CommandInvocation): Promise<CoreMessage> {
  const settings = await getSettings(ctx);
  const channelId = resolveChannelId(inv) ?? inv.channelId;
  if (!channelId) return text('⛔ يرجى تحديد القناة');
  const action = (optString(inv, 'action') ?? inv.args[0] ?? 'add').toLowerCase().trim();
  const rooms = [...(settings.jailShowRoom ?? [])];
  if (action === 'remove') {
    if (!rooms.includes(channelId)) return text('⛔ هذه القناة ليست من غرف السجن');
    settings.jailShowRoom = rooms.filter((id) => id !== channelId);
    await ctx.storage.set('settings', settings);
    return text(`✅ تمت إزالة <#${channelId}> من غرف السجن\n📋 العدد الحالي: **${settings.jailShowRoom.length}**`);
  }
  if (rooms.includes(channelId)) return text('⛔ هذه القناة موجودة مسبقاً في غرف السجن');
  settings.jailShowRoom = [...rooms, channelId];
  await ctx.storage.set('settings', settings);
  return text(`✅ تمت إضافة <#${channelId}> إلى غرف السجن\n📋 العدد الحالي: **${settings.jailShowRoom.length}**`);
}

// ---------- option registrations ----------

const OPTIONS: Record<string, CommandOptionRegistration[]> = {
  say: [
    { name: 'message', description: 'الرسالة', type: 'STRING', required: true },
    { name: 'channel', description: 'القناة', type: 'CHANNEL' },
  ],
  user: [{ name: 'user', description: 'المستخدم', type: 'USER' }],
  avatar: [{ name: 'user', description: 'المستخدم', type: 'USER' }],
  banner_user: [{ name: 'user', description: 'المستخدم', type: 'USER' }],
  afk: [{ name: 'reason', description: 'سبب الغياب', type: 'STRING' }],
  ban: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING', required: true },
    { name: 'duration', description: 'مدة الحظر (اختياري)', type: 'STRING' },
  ],
  kick: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  mute: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'duration', description: 'المدة (مثال: 10m، 2h، 1d)', type: 'STRING', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  unmute: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  unban: [
    { name: 'user', description: 'معرف المستخدم', type: 'STRING', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  unban_all: [],
  jail: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING' },
    { name: 'duration', description: 'مدة السجن (اختياري)', type: 'STRING' },
  ],
  unjail: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  warn: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING', required: true },
  ],
  unwarn: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'case', description: 'معرّف الإنذار', type: 'STRING', required: true },
  ],
  warning: [{ name: 'user', description: 'المستخدم', type: 'USER' }],
  clear: [
    { name: 'amount', description: 'عدد الرسائل', type: 'INTEGER', required: true },
    { name: 'channel', description: 'القناة', type: 'CHANNEL' },
  ],
  lock: [
    { name: 'channel', description: 'القناة', type: 'CHANNEL' },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  unlock: [
    { name: 'channel', description: 'القناة', type: 'CHANNEL' },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  slowmode: [
    { name: 'seconds', description: 'المدة بالثواني', type: 'INTEGER', required: true },
    { name: 'channel', description: 'القناة', type: 'CHANNEL' },
  ],
  rename: [
    { name: 'name', description: 'الاسم الجديد', type: 'STRING', required: true },
    { name: 'channel', description: 'القناة', type: 'CHANNEL' },
  ],
  temp_role: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'role', description: 'الرتبة', type: 'ROLE', required: true },
    { name: 'duration', description: 'المدة (مثال: 10m، 2h، 1d)', type: 'STRING', required: true },
  ],
  add_role: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'role', description: 'الرتبة', type: 'ROLE', required: true },
  ],
  remove_role: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'role', description: 'الرتبة', type: 'ROLE', required: true },
  ],
  multi_role: [
    { name: 'action', description: 'add أو remove', type: 'STRING', required: true },
    { name: 'role', description: 'الرتبة', type: 'ROLE', required: true },
  ],
  auto_role: [{ name: 'role', description: 'الرتبة', type: 'ROLE' }],
  come: [
    { name: 'user', description: 'المستخدم', type: 'USER', required: true },
    { name: 'reason', description: 'السبب', type: 'STRING' },
  ],
  set_prefix: [{ name: 'prefix', description: 'البادئة الجديدة', type: 'STRING', required: true }],
  set_perm: [
    { name: 'command', description: 'اسم الأمر', type: 'STRING', required: true },
    { name: 'role', description: 'الرتبة', type: 'ROLE', required: true },
  ],
  set_perm_all: [{ name: 'role', description: 'الرتبة', type: 'ROLE', required: true }],
  set_perm_reset: [],
  set_whitelist: [
    { name: 'role', description: 'الرتبة', type: 'ROLE', required: true },
    { name: 'remove', description: 'إزالة بدلاً من الإضافة', type: 'BOOLEAN' },
  ],
  actions_show_room_jail: [
    { name: 'channel', description: 'القناة', type: 'CHANNEL', required: true },
    { name: 'action', description: 'add أو remove', type: 'STRING' },
  ],
  actions_color: [
    { name: 'command', description: 'اسم الأمر', type: 'STRING', required: true },
    { name: 'color', description: 'اللون بصيغة HEX', type: 'STRING', required: true },
  ],
  actions_label: [
    { name: 'command', description: 'اسم الأمر', type: 'STRING', required: true },
    { name: 'label', description: 'التسمية الجديدة', type: 'STRING', required: true },
  ],
  actions_enabled: [
    { name: 'command', description: 'اسم الأمر', type: 'STRING', required: true },
    { name: 'enabled', description: 'التفعيل أو التعطيل', type: 'BOOLEAN', required: true },
  ],
  actions_log: [{ name: 'channel', description: 'القناة', type: 'CHANNEL', required: true }],
  court_set_name: [{ name: 'name', description: 'الاسم الجديد', type: 'STRING', required: true }],
  court_set_color: [{ name: 'color', description: 'اللون بصيغة HEX', type: 'STRING', required: true }],
  court_set_logo: [{ name: 'logo', description: 'رابط الشعار', type: 'STRING', required: true }],
  court_set_log: [{ name: 'channel', description: 'القناة', type: 'CHANNEL', required: true }],
};

for (const feature of [
  'anti_ban', 'anti_kick', 'anti_bots', 'anti_webhooks',
  'anti_channel_create', 'anti_channel_delete', 'anti_role_create', 'anti_role_delete',
  'anti_role_add',
] as const) {
  OPTIONS[feature] = [
    { name: 'enabled', description: 'تفعيل أو تعطيل', type: 'BOOLEAN' },
    { name: 'limit', description: 'الحد الأقصى', type: 'INTEGER' },
    { name: 'action', description: 'الإجراء (1-5)', type: 'STRING' },
  ];
}

// ---------- handlers table ----------

interface LocalMessagePayload {
  guildId?: string;
  channelId?: string;
  authorId?: string;
  content?: string;
}

function buildHandlers(ctx: PluginContext): Record<string, CommandHandler> {
  return {
    ping: handler(ctx, 'ping', handlePing),
    help: handler(ctx, 'help', handleHelp),
    user: handler(ctx, 'user', handleUser),
    server: handler(ctx, 'server', handleServer),
    roles: handler(ctx, 'roles', handleRoles),
    avatar: handler(ctx, 'avatar', handleAvatar),
    banner_server: handler(ctx, 'banner_server', handleBannerServer),
    banner_user: handler(ctx, 'banner_user', handleBannerUser),
    logo_server: handler(ctx, 'logo_server', handleLogoServer),
    afk: handler(ctx, 'afk', handleAfk),
    say: handler(ctx, 'say', handleSay),
    ban: handler(ctx, 'ban', handleBan),
    kick: handler(ctx, 'kick', handleKick),
    mute: handler(ctx, 'mute', handleMute),
    unmute: handler(ctx, 'unmute', handleUnmute),
    unban: handler(ctx, 'unban', handleUnban),
    unban_all: handler(ctx, 'unban_all', handleUnbanAll),
    jail: handler(ctx, 'jail', handleJail),
    unjail: handler(ctx, 'unjail', handleUnjail),
    warn: handler(ctx, 'warn', handleWarn),
    unwarn: handler(ctx, 'unwarn', handleUnwarn),
    warning: handler(ctx, 'warning', handleWarning),
    clear: handler(ctx, 'clear', handleClear),
    lock: handler(ctx, 'lock', (_ctx, inv) => handleLock(ctx, inv, true)),
    unlock: handler(ctx, 'unlock', (_ctx, inv) => handleLock(ctx, inv, false)),
    slowmode: handler(ctx, 'slowmode', handleSlowmode),
    rename: handler(ctx, 'rename', handleRename),
    temp_role: handler(ctx, 'temp_role', handleTempRole),
    add_role: handler(ctx, 'add_role', (_ctx, inv) => handleAddRemoveRole(ctx, inv, true)),
    remove_role: handler(ctx, 'remove_role', (_ctx, inv) => handleAddRemoveRole(ctx, inv, false)),
    multi_role: handler(ctx, 'multi_role', handleMultiRole),
    auto_role: handler(ctx, 'auto_role', handleAutoRole),
    come: handler(ctx, 'come', handleCome),
    set_prefix: handler(ctx, 'set_prefix', handleSetPrefix),
    set_perm: handler(ctx, 'set_perm', handleSetPerm),
    set_perm_all: handler(ctx, 'set_perm_all', handleSetPermAll),
    set_perm_reset: handler(ctx, 'set_perm_reset', handleSetPermReset),
    set_whitelist: handler(ctx, 'set_whitelist', handleSetWhitelist),
    actions_role_mute: handler(ctx, 'actions_role_mute', (_ctx, inv) => buildRoleMenu(ctx, 'mute')),
    actions_role_jail: handler(ctx, 'actions_role_jail', (_ctx, inv) => buildRoleMenu(ctx, 'jail')),
    actions_show_room_jail: handler(ctx, 'actions_show_room_jail', handleShowRoomJail),
    actions_color: handler(ctx, 'actions_color', handleActionsColor),
    actions_label: handler(ctx, 'actions_label', handleActionsLabel),
    actions_enabled: handler(ctx, 'actions_enabled', handleActionsEnabled),
    actions_log: handler(ctx, 'actions_log', handleActionsLog),
    court_set_name: handler(ctx, 'court_set_name', (_ctx, inv) => handleCourtSet(ctx, inv, 'name')),
    court_set_color: handler(ctx, 'court_set_color', (_ctx, inv) => handleCourtSet(ctx, inv, 'color')),
    court_set_logo: handler(ctx, 'court_set_logo', (_ctx, inv) => handleCourtSet(ctx, inv, 'logo')),
    court_set_log: handler(ctx, 'court_set_log', handleCourtSetLog),
    anti_ban: handler(ctx, 'anti_ban', makeAntiHandler(ctx, 'anti_ban')),
    anti_kick: handler(ctx, 'anti_kick', makeAntiHandler(ctx, 'anti_kick')),
    anti_bots: handler(ctx, 'anti_bots', makeAntiHandler(ctx, 'anti_bots')),
    anti_webhooks: handler(ctx, 'anti_webhooks', makeAntiHandler(ctx, 'anti_webhooks')),
    anti_channel_create: handler(ctx, 'anti_channel_create', makeAntiHandler(ctx, 'anti_channel_create')),
    anti_channel_delete: handler(ctx, 'anti_channel_delete', makeAntiHandler(ctx, 'anti_channel_delete')),
    anti_role_create: handler(ctx, 'anti_role_create', makeAntiHandler(ctx, 'anti_role_create')),
    anti_role_delete: handler(ctx, 'anti_role_delete', makeAntiHandler(ctx, 'anti_role_delete')),
    anti_role_add: handler(ctx, 'anti_role_add', makeAntiHandler(ctx, 'anti_role_add')),
  };
}

// ---------- events ----------

async function handleMessageCreate(ctx: PluginContext, payload: LocalMessagePayload): Promise<void> {
  const cfg = await getCommand(ctx, 'afk');
  if (!cfg.enabled) return;
  const authorId = payload.authorId;
  const channelId = payload.channelId;
  if (!authorId || !channelId) return;

  const afk = await getAfk(ctx);
  if (afk[authorId]) {
    const entry = afk[authorId];
    delete afk[authorId];
    await saveAfk(ctx, afk);
    await ctx.messages.sendChannel(
      channelId,
      text(`👋 أهلاً بعودتك! كنت بعيداً لمدة **${ageFromTimestamp(entry.timestamp)}**`),
    ).catch(() => undefined);
    return;
  }

  const content = payload.content ?? '';
  const mentioned = Object.keys(afk).find((userId) => content.includes(`<@${userId}>`) || content.includes(`<@!${userId}>`));
  if (mentioned) {
    const afkEntry = afk[mentioned];
    if (!afkEntry) return;
    const user = await ctx.guild.fetchUser(mentioned).catch(() => null);
    await ctx.messages.sendChannel(
      channelId,
      text(`💬 ${user ? user.username : mentioned} في وضع الابتعاد حالياً (AFK)\nسبب الغياب: **${afkEntry.reason}**`),
    ).catch(() => undefined);
  }
}

async function handleGuildMemberAdd(ctx: PluginContext, payload: Record<string, unknown>): Promise<void> {
  const userId = payload.userId as string | undefined;
  if (!userId) return;
  const members = await getMembers(ctx);
  members[userId] = [];
  await saveMembers(ctx, members);
  const settings = await getSettings(ctx);
  if (!settings.autoRole) return;
  const cfg = await getCommand(ctx, 'auto_role');
  if (!cfg.enabled) return;
  await ctx.guild.addRole(userId, settings.autoRole).catch(() => undefined);
}

async function handleGuildMemberRemove(ctx: PluginContext, payload: Record<string, unknown>): Promise<void> {
  const userId = payload.userId as string | undefined;
  if (!userId) return;
  const members = await getMembers(ctx);
  if (userId in members) {
    delete members[userId];
    await saveMembers(ctx, members);
  }
}

// ---------- plugin module ----------

const adminPlugin: PluginModule = {
  async onInstall(ctx: PluginContext): Promise<void> {
    const seeded = await ctx.storage.get<boolean>('seeded');
    if (seeded) return;
    await ctx.storage.set('settings', structuredClone(DEFAULT_SETTINGS));
    await ctx.storage.set('commands', structuredClone(DEFAULT_COMMANDS));
    await ctx.storage.set('actionMeta', {});
    await ctx.storage.set('records', {});
    await ctx.storage.set('afk', {});
    await ctx.storage.set('jailed', {});
    await ctx.storage.set('protection', structuredClone(DEFAULT_PROTECTION));
    await ctx.storage.set('clearlogs', []);
    await ctx.storage.set('members', {});
    await ctx.storage.set('seeded', true);
  },

  async onEnable(ctx: PluginContext): Promise<void> {
    const handlers = buildHandlers(ctx);

    for (const commandId of ALL_COMMAND_IDS) {
      const meta = COMMAND_NAMES[commandId];
      if (!meta) {
        ctx.logger.warn('admin command metadata missing', { commandId });
        continue;
      }
      const cfg = await getCommand(ctx, commandId);
      try {
        await ctx.commands.register({
          commandId,
          name: meta.name,
          description: COMMAND_DESCRIPTIONS[commandId] ?? commandId,
          type: 'BOTH',
          aliases: meta.aliases,
          options: OPTIONS[commandId] ?? [],
          autoDeleteAuthorMessage: cfg.autoDeleteAuthor,
          autoDeleteReplyOnAuthorDelete: cfg.autoDeleteReply,
          handler: handlers[commandId]!,
        });
      } catch (error) {
        ctx.logger.warn('admin command registration failed', { commandId });
      }
    }

    ctx.interactions.onSelect('admin-mute-role', (interaction) => handleRoleSelect(ctx, interaction, 'mute'));
    ctx.interactions.onSelect('admin-jail-role', (interaction) => handleRoleSelect(ctx, interaction, 'jail'));

    ctx.events.on('messageCreate', (payload) => handleMessageCreate(ctx, payload as LocalMessagePayload));
    ctx.events.on('guildMemberAdd', (payload) => handleGuildMemberAdd(ctx, payload));
    ctx.events.on('guildMemberRemove', (payload) => handleGuildMemberRemove(ctx, payload));
  },

  async onDisable(ctx: PluginContext): Promise<void> {
    ctx.scheduler.cancelAll();
  },
};

export default adminPlugin;