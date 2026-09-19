import type {
  PluginChannelCreateOptions,
  PluginComponentInteraction,
  PluginContext,
  PluginMessageEntry,
  PluginModal,
  PluginModule,
} from '@vortex/core';
import type { CoreMessage } from '@vortex/types';

const STORAGE_SETTINGS = 'settings';
const STORAGE_OPEN_TICKETS = 'open_tickets';
const STORAGE_STATS = 'ticket_stats';
const STORAGE_COOLDOWNS = 'ticket_cooldowns';
const STORAGE_FEEDBACK = 'ticket_feedback';
const STORAGE_TRANSCRIPTS = 'transcripts';
const STORAGE_STAFF_POINTS = 'staff_points';
const STORAGE_STAFF_SCORES = 'staff_scores';

const ACCENT_PANEL = 0x5865f2;
const ACCENT_CLAIM = 0x5865f2;
const ACCENT_UNCLAIM = 0xfee75c;
const ACCENT_ADD = 0x57f287;
const ACCENT_REMOVE = 0xed4245;
const ACCENT_FEEDBACK_PROMPT = 0xfee75c;
const ACCENT_POSITIVE = 0x57f287;
const ACCENT_NEUTRAL = 0xfee75c;
const ACCENT_NEGATIVE = 0xed4245;
const ACCENT_REWARD = 0xf59e0b;
const ACCENT_RULES = 0x5865f2;
const ACCENT_ESCALATE = 0x7c3aed;

const ID_OPEN = 'ticket_open:';
const ID_MP_SELECT = 'ticket_mp_select:';
const ID_MP_REFRESH = 'ticket_mp_refresh:';
const ID_FORM = 'ticket_form:';
const ID_CLOSE = 'ticket_close:';
const ID_CLOSE_REASON = 'ticket_close_reason:';
const ID_CLAIM = 'ticket_claim:';
const ID_UNCLAIM = 'ticket_unclaim:';
const ID_ADD = 'ticket_add:';
const ID_ADD_MODAL = 'ticket_adduser_modal:';
const ID_REMOVE = 'ticket_remove:';
const ID_REMOVE_MODAL = 'ticket_removeuser_modal:';
const ID_RULES = 'ticket_rules:';
const ID_ESCALATE = 'ticket_escalate:';
const ID_ESCALATE_SEL = 'ticket_escalate_sel:';
const ID_ACTION_SEL = 'ticket_action_sel:';
const ID_FB = 'ticket_fb:';

const VIEW_CHANNEL = 1n << 10n;
const SEND_MESSAGES = 1n << 11n;
const MANAGE_MESSAGES = 1n << 13n;
const EMBED_LINKS = 1n << 14n;
const ATTACH_FILES = 1n << 15n;
const READ_MESSAGE_HISTORY = 1n << 16n;
const ADD_REACTIONS = 1n << 6n;

const MEMBER_ALLOW = VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY | ATTACH_FILES;
const SUPPORT_ALLOW = VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY | MANAGE_MESSAGES;
const ACL_ALLOW = VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY;

const CLOSE_DELETE_MS = 5_000;
const PANEL_REFRESH_MS = 60_000;
const PANEL_FRESH_MS = 30 * 60_000;

const BTN_STYLE: Record<string, 'primary' | 'secondary' | 'success' | 'danger'> = {
  1: 'primary',
  2: 'secondary',
  3: 'success',
  4: 'danger',
};

interface GeneralSettings {
  [key: string]: unknown;
}

interface TicketPanel {
  id: string;
  name: string;
  panelTitle: string;
  panelChannel: string | null;
  threadNotifChannel: string | null;
  category: string | null;
  mentionRole: string | null;
  transcriptChannel: string | null;
  threadMode: boolean;
  cooldown: number;
  maxOpen: number;
  hideClose: boolean | null;
  hideCloseReason: boolean | null;
  hideClaim: boolean | null;
  disabled: boolean;
  alwaysOpen: boolean;
  timezone: string;
  hours: Record<string, { open?: string; close?: string }>;
  acl: Array<{ action?: string; type?: string; target?: string }>;
  supportRoles: string[];
  formEnabled: boolean;
  formQuestions: Array<{ label?: string; style?: string; required?: boolean; placeholder?: string }>;
  transcriptEnabled: boolean;
  transcriptDm: boolean;
  feedbackEnabled: boolean;
  feedbackChannel: string | null;
  namingMode: string;
  namingCustom: string;
  useSelectMenu: boolean;
  selectMenuPlaceholder: string;
  selectMenuDesc: string;
  btnText: string;
  btnEmoji: string;
  btnColor: number | null;
  bannerImage: string;
  description: string;
  panelColor: string | null;
  welcomeColor: string | null;
  welcomeTitle: string;
  welcomeDesc: string;
  welcomeFooter: string;
  welcomeTimestamp: boolean;
  welcomeAuthor: string;
  actionBtnsMode: string;
  actionBtns: Record<string, { emoji?: string; style?: number; labelMode?: string }>;
  awaitingCat: string | null;
  logChannel: string | null;
}

interface MultiPanel {
  id: string;
  channel: string | null;
  panelTitle: string;
  description: string;
  accentColor: string | null;
  bannerImage: string;
  useDropdown: boolean;
  placeholder: string;
  showRefreshBtn: boolean;
  refreshBtnLabel: string;
  panels: Array<Record<string, unknown>>;
}

interface ResolvedPanel {
  panelId?: string;
  id?: string;
  name?: string;
  panelTitle?: string;
  btnText?: string;
  btnEmoji?: string;
  btnColor?: number | null;
  overrideBtnText?: string;
  overrideBtnEmoji?: string;
  overrideBtnColor?: number | null;
}

interface TicketSettings {
  enabled: boolean;
  general: GeneralSettings;
  panels: Array<Record<string, unknown>>;
  multiPanels: Array<Record<string, unknown>>;
  supportRoles: string[];
  logChannel: string | null;
}

interface TicketRecord {
  id: string;
  number: number;
  panelId: string;
  guildId: string;
  channelId: string;
  userId: string;
  claimedBy: string | null;
  claimedAt?: string | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
  closedBy: string | null;
  closeReason: string | null;
  transcriptPath: string | null;
  transcriptChannelMsgId: string | null;
  escalated?: boolean;
  members?: string[];
}

interface OpenTicketsData {
  tickets: TicketRecord[];
  nextNumber: number | null;
}

interface StatsState {
  avg_response_ms: number;
  total_closed: number;
  last_reset_date: string;
  closed_today: number;
}

interface FeedbackEntry {
  ticketId: string;
  panelId: string | null;
  userId: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

interface FeedbackData {
  entries: FeedbackEntry[];
}

interface StaffPointsConfig {
  enabled: boolean;
  ticketPoints: {
    enabled: boolean;
    claim: { enabled: boolean; points: number };
    close: { enabled: boolean; points: number };
  };
  ratingPoints: { enabled: boolean; stars: Record<string, number> };
  commandPoints: { enabled: boolean; commands: Array<{ id?: string; name?: string; points?: number }> };
  logsChannelId: string | null;
  antiAbuse: {
    enabled: boolean;
    noSelfClaim: boolean;
    noSelfRate: boolean;
    noDuplicatePoints: boolean;
    cooldownMinutes: number;
  };
  rewards: {
    enabled: boolean;
    list: Array<{ id?: string; points?: number; roleId?: string; label?: string }>;
  };
}

interface StaffScoreEntry {
  points: number;
  history: Array<Record<string, unknown>>;
  lastActions: Record<string, string>;
}

type StaffScores = Record<string, StaffScoreEntry>;

type Cv2Item =
  | { type: 'text_display'; content: string }
  | { type: 'separator'; spacing?: 'small' | 'large'; divider?: boolean }
  | { type: 'media'; url: string; description?: string; spoiler?: boolean }
  | Cv2Button
  | Cv2Select;

interface Cv2Button {
  type: 'button';
  id: string;
  label: string;
  style: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
  disabled?: boolean;
  emoji?: string;
}

interface Cv2SelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
}

interface Cv2Select {
  type: 'select';
  id: string;
  placeholder?: string;
  options: Cv2SelectOption[];
  minValues?: number;
  maxValues?: number;
  disabled?: boolean;
}

interface ActionDef {
  key: string;
  id: string;
  label: string;
  defEmoji: string;
  defStyle: 'danger' | 'primary' | 'secondary';
}

type OpenCheckResult = { ok: true } | { ok: false; message: string };

const DEFAULT_GENERAL: GeneralSettings = {
  LANGUAGE: 'server_default',
  TICKET_LIMIT_PER_USER: 1,
  ALLOW_USER_CLOSE: true,
  CLOSE_CONFIRMATION: true,
  ENABLE_FEEDBACK: false,
  ANONYMISE_RESPONSES: false,
  THREAD_MODE: false,
  DISABLE_OPEN_COMMAND: false,
  NOTIFICATION_CHANNEL: null,
  TRANSCRIPTS_CHANNEL: null,
  CHANNEL_CATEGORY: null,
  OVERFLOW_CATEGORY: null,
  NAMING_SCHEME: 'ticket-{number}',
  WELCOME_MESSAGE: 'شكرًا لتواصلك مع الدعم.\nيرجى وصف مشكلتك.',
  CLAIM_SUPPORT_VIEW: true,
  CLAIM_SUPPORT_TYPE: true,
  AUTO_CLOSE_ON_LEAVE: false,
  AC_NO_RESPONSE_ENABLED: false,
  AC_NO_RESPONSE_DAYS: 0,
  AC_NO_RESPONSE_HOURS: 0,
  AC_NO_RESPONSE_MINS: 0,
  AC_LAST_MSG_ENABLED: false,
  AC_LAST_MSG_DAYS: 0,
  AC_LAST_MSG_HOURS: 0,
  AC_LAST_MSG_MINS: 0,
  OPEN_PERMISSION: 'everyone',
  OPEN_PERMISSION_ROLE: null,
  ADD_MSG_SENDER: false,
  PERM_ATTACH_FILES: true,
  PERM_EMBED_LINKS: true,
  PERM_ADD_REACTIONS: true,
  COLOR_SUCCESS: '#22c55e',
  COLOR_FAILURE: '#ef4444',
  HIDE_CLOSE_BTN: false,
  HIDE_CLOSE_REASON_BTN: false,
  HIDE_CLAIM_BTN: false,
  RULES_BTN_ENABLED: false,
  RULES_BTN_TEXT: '',
  RULES_BTN_EMOJI: '',
  RULES_BTN_LABEL: '',
  RULES_BTN_STYLE: 2,
  ESCALATE_ENABLED: false,
  ESCALATE_CATEGORIES: [],
  ESCALATE_ROLES: [],
};

const DEFAULT_OPEN_TICKETS: OpenTicketsData = { tickets: [], nextNumber: 1 };
const DEFAULT_STATS: StatsState = { avg_response_ms: 0, total_closed: 0, last_reset_date: '', closed_today: 0 };
const DEFAULT_FEEDBACK: FeedbackData = { entries: [] };
const DEFAULT_COOLDOWNS: Record<string, string> = {};

const DEFAULT_STAFF_POINTS: StaffPointsConfig = {
  enabled: false,
  ticketPoints: {
    enabled: false,
    claim: { enabled: true, points: 5 },
    close: { enabled: true, points: 3 },
  },
  ratingPoints: {
    enabled: false,
    stars: { '5': 10, '4': 5, '3': 0, '2': -2, '1': -5 },
  },
  commandPoints: {
    enabled: false,
    commands: [],
  },
  logsChannelId: null,
  antiAbuse: {
    enabled: true,
    noSelfClaim: true,
    noSelfRate: true,
    noDuplicatePoints: true,
    cooldownMinutes: 60,
  },
  rewards: {
    enabled: false,
    list: [],
  },
};

const pendingCloseTasks = new Set<string>();

export default {
  async onInstall(context: PluginContext): Promise<void> {
    if (!(await context.storage.get<unknown>(STORAGE_SETTINGS))) {
      await context.storage.set(STORAGE_SETTINGS, {
        enabled: false,
        general: DEFAULT_GENERAL,
        panels: [],
        multiPanels: [],
        supportRoles: [],
        logChannel: null,
      });
    }
    if (!(await context.storage.get<unknown>(STORAGE_OPEN_TICKETS))) {
      await context.storage.set(STORAGE_OPEN_TICKETS, DEFAULT_OPEN_TICKETS);
    }
    if (!(await context.storage.get<unknown>(STORAGE_STATS))) {
      await context.storage.set(STORAGE_STATS, DEFAULT_STATS);
    }
    if (!(await context.storage.get<unknown>(STORAGE_COOLDOWNS))) {
      await context.storage.set(STORAGE_COOLDOWNS, DEFAULT_COOLDOWNS);
    }
    if (!(await context.storage.get<unknown>(STORAGE_FEEDBACK))) {
      await context.storage.set(STORAGE_FEEDBACK, DEFAULT_FEEDBACK);
    }
    context.logger.info('Tickets plugin installed.');
  },

  async onEnable(context: PluginContext): Promise<void> {
    context.interactions.onButton(ID_OPEN, (interaction) => {
      void handleOpenTicket(context, interaction);
    });
    context.interactions.onSelect(ID_MP_SELECT, (interaction) => {
      void handleOpenSelect(context, interaction);
    });
    context.interactions.onModal(ID_FORM, (interaction) => {
      void handleFormModal(context, interaction);
    });
    context.interactions.onButton(ID_CLOSE, (interaction) => {
      void handleCloseButton(context, interaction);
    });
    context.interactions.onModal(ID_CLOSE_REASON, (interaction) => {
      void handleCloseReasonModal(context, interaction);
    });
    context.interactions.onButton(ID_CLAIM, (interaction) => {
      void handleClaim(context, interaction);
    });
    context.interactions.onButton(ID_UNCLAIM, (interaction) => {
      void handleUnclaim(context, interaction);
    });
    context.interactions.onButton(ID_ADD, (interaction) => {
      void handleAddRemoveButton(context, interaction, 'add');
    });
    context.interactions.onModal(ID_ADD_MODAL, (interaction) => {
      void handleAddRemoveModal(context, interaction, 'add', interaction.customId.slice(ID_ADD_MODAL.length));
    });
    context.interactions.onButton(ID_REMOVE, (interaction) => {
      void handleAddRemoveButton(context, interaction, 'remove');
    });
    context.interactions.onModal(ID_REMOVE_MODAL, (interaction) => {
      void handleAddRemoveModal(context, interaction, 'remove', interaction.customId.slice(ID_REMOVE_MODAL.length));
    });
    context.interactions.onSelect(ID_ACTION_SEL, (interaction) => {
      void handleActionSelect(context, interaction);
    });
    context.interactions.onButton(ID_RULES, (interaction) => {
      void handleRulesButton(context, interaction);
    });
    context.interactions.onButton(ID_ESCALATE, (interaction) => {
      void handleEscalateButton(context, interaction);
    });
    context.interactions.onSelect(ID_ESCALATE_SEL, (interaction) => {
      void handleEscalateSelect(context, interaction);
    });
    context.interactions.onButton(ID_MP_REFRESH, (interaction) => {
      void handleMpRefresh(context, interaction);
    });
    context.interactions.onButton(ID_FB, (interaction) => {
      void handleFeedbackButton(context, interaction);
    });

    await refreshPanels(context);
    context.scheduler.cancel('panel-refresh');
    context.scheduler.schedule('panel-refresh', PANEL_REFRESH_MS, () => {
      void refreshPanels(context);
    });

    context.logger.info('Tickets plugin enabled.');
  },

  async onDisable(context: PluginContext): Promise<void> {
    context.scheduler.cancel('panel-refresh');
    for (const key of pendingCloseTasks) {
      context.scheduler.cancel(key);
    }
    pendingCloseTasks.clear();
    context.logger.info('Tickets plugin disabled.');
  },
} satisfies PluginModule;

async function handleOpenTicket(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const panelId = interaction.customId.slice(ID_OPEN.length);
  const settings = await loadSettings(context);
  if (!settings.enabled) {
    await replyEphemeral(interaction, '❌ نظام التذاكر معطل.');
    return;
  }
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === panelId);
  if (!panelRecord) {
    await replyEphemeral(interaction, '❌ البانل غير موجودة.');
    return;
  }
  await openTicketFlow(context, interaction, panelOf(panelRecord), settings);
}

async function handleOpenSelect(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const value = firstSelected(interaction);
  const panelId = value ? value.slice(ID_OPEN.length) : '';
  const settings = await loadSettings(context);
  if (!settings.enabled) {
    await replyEphemeral(interaction, '❌ نظام التذاكر معطل.');
    return;
  }
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === panelId);
  if (!panelRecord) {
    await replyEphemeral(interaction, '❌ البانل غير موجودة.');
    return;
  }
  await openTicketFlow(context, interaction, panelOf(panelRecord), settings);
}

async function openTicketFlow(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  panel: TicketPanel,
  settings: TicketSettings,
): Promise<void> {
  if (panel.formEnabled && Array.isArray(panel.formQuestions) && panel.formQuestions.length > 0) {
    await interaction.respond({ kind: 'showModal', modal: buildFormModal(panel) });
    return;
  }

  await interaction.respond({ kind: 'deferReply', ephemeral: true });

  const check = await runOpenChecks(context, interaction, panel, settings);
  if (!check.ok) {
    await editReplyEphemeral(interaction, check.message ?? '❌ حدث خطأ.');
    return;
  }

  const created = await createTicketChannel(context, interaction, panel, settings);
  if (!created) {
    await editReplyEphemeral(interaction, '❌ تعذر إنشاء قناة التذكرة. يرجى التواصل مع الإدارة.');
    return;
  }

  await interaction.respond({
    kind: 'editReply',
    message: buildContainer(
      context,
      [{ type: 'text_display', content: `✅ تم إنشاء تذكرتك: <#${created.channelId}>` }],
      openSuccessAccent(panel, settings),
    ),
  });
}

async function handleFormModal(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const panelId = interaction.customId.slice(ID_FORM.length);
  const settings = await loadSettings(context);
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === panelId);
  if (!panelRecord) {
    await replyEphemeral(interaction, '❌ البانل غير موجودة.');
    return;
  }
  const panel = panelOf(panelRecord);

  const answers = (panel.formQuestions || []).slice(0, 5).map((q, i) => ({
    label: q.label || `سؤال ${i + 1}`,
    answer: asString(interaction.modalFields?.[`q${i}`]),
  }));

  await interaction.respond({ kind: 'deferReply', ephemeral: true });

  const check = await runOpenChecks(context, interaction, panel, settings, { skipHours: true });
  if (!check.ok) {
    await editReplyEphemeral(interaction, check.message ?? '❌ حدث خطأ.');
    return;
  }

  const created = await createTicketChannel(context, interaction, panel, settings);
  if (!created) {
    await editReplyEphemeral(interaction, '❌ تعذر إنشاء قناة التذكرة. يرجى التواصل مع الإدارة.');
    return;
  }

  const filledAnswers = answers.filter((a) => a.answer.trim().length > 0);
  if (filledAnswers.length > 0) {
    const items: Cv2Item[] = [
      { type: 'text_display', content: `## 📋 إجابات النموذج — <@${interaction.userId}>` },
      { type: 'separator' },
      {
        type: 'text_display',
        content: answers
          .map((a) => `> **${a.label}**\n> ${a.answer.trim() ? a.answer.replace(/\n/g, '\n> ') : '*—*'}`)
          .join('\n\n'),
      },
    ];
    await context.messages
      .sendChannel(created.channelId, buildContainer(context, items, ACCENT_PANEL))
      .catch(() => undefined);
  }

  await interaction.respond({
    kind: 'editReply',
    message: buildContainer(
      context,
      [{ type: 'text_display', content: `✅ تم إنشاء تذكرتك: <#${created.channelId}>` }],
      openSuccessAccent(panel, settings),
    ),
  });
}

function buildFormModal(panel: TicketPanel): PluginModal {
  const title = (panel.panelTitle || 'فتح تذكرة').substring(0, 45);
  const questions = (panel.formQuestions || []).slice(0, 5);
  const fields: PluginModal['fields'] = questions.map((q, i) => {
    const field: {
      id: string;
      label: string;
      style: 'short' | 'paragraph';
      required: boolean;
      maxLength: number;
      placeholder?: string;
    } = {
      id: `q${i}`,
      label: (q.label || `سؤال ${i + 1}`).substring(0, 45),
      style: q.style === 'paragraph' ? 'paragraph' : 'short',
      required: q.required !== false,
      maxLength: q.style === 'paragraph' ? 1000 : 200,
    };
    if (q.placeholder) {
      field.placeholder = q.placeholder.substring(0, 100);
    }
    return field;
  });
  return { id: `${ID_FORM}${panel.id}`, title, fields };
}

async function handleCloseButton(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const ticketId = interaction.customId.slice(ID_CLOSE.length);
  await closeTicket(context, interaction, ticketId, '');
}

async function handleCloseReasonModal(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const ticketId = interaction.customId.slice(ID_CLOSE_REASON.length);
  const reason = asString(interaction.modalFields?.['reason']);
  await closeTicket(context, interaction, ticketId, reason);
}

async function runOpenChecks(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  panel: TicketPanel,
  settings: TicketSettings,
  opts: { skipHours?: boolean } = {},
): Promise<OpenCheckResult> {
  if (!settings.enabled) {
    return { ok: false, message: '❌ نظام التذاكر معطل.' };
  }
  if (panel.disabled) {
    return { ok: false, message: '❌ هذه البانل معطلة حاليًا.' };
  }
  if (!passesAcl(interaction, panel.acl)) {
    return { ok: false, message: '❌ لا تملك إذنًا لفتح تذكرة في هذه البانل.' };
  }
  if (!opts.skipHours && !panel.alwaysOpen && !isPanelOpenNow(panel)) {
    // Legacy parity: include the configured open window and timezone in the notice.
    const window = describeOpenWindow(panel);
    return {
      ok: false,
      message: window
        ? `❌ التذاكر مغلقة حاليًا. ساعات العمل: ${window}.`
        : '❌ التذاكر مغلقة حاليًا في هذه البانل.',
    };
  }

  if (panel.cooldown > 0) {
    const cooldowns = (await context.storage.get<Record<string, string>>(STORAGE_COOLDOWNS)) ?? {};
    const last = cooldowns[`${panel.id}_${interaction.userId}`];
    if (last) {
      const elapsed = Date.now() - new Date(last).getTime();
      const total = panel.cooldown * 1000;
      if (elapsed < total) {
        const left = Math.ceil((total - elapsed) / 1000);
        const unit = left >= 60 ? `${Math.ceil(left / 60)}m` : `${left}s`;
        return { ok: false, message: `⏳ أنت في فترة انتظار. حاول مجددًا بعد **${unit}**.` };
      }
    }
    cooldowns[`${panel.id}_${interaction.userId}`] = new Date().toISOString();
    await context.storage.set(STORAGE_COOLDOWNS, cooldowns);
  }

  const panelLimit = panel.maxOpen;
  const otDb = await readOpenTickets(context);
  const userOpen = otDb.tickets.filter(
    (t) => t.userId === interaction.userId && t.panelId === panel.id && t.status === 'open',
  );
  if (panelLimit > 0 && userOpen.length >= panelLimit) {
    const existing = userOpen[0];
    const target = existing?.channelId ? `<#${existing.channelId}>` : 'تذكرتك الحالية';
    return { ok: false, message: `❌ لديك تذكرة مفتوحة بالفعل: ${target}` };
  }

  return { ok: true };
}

function isPanelOpenNow(panel: TicketPanel): boolean {
  const hours = panel.hours;
  if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) {
    return true;
  }
  const tz = panel.timezone || 'UTC';
  let longDay: string;
  let shortDay: string;
  let minutes: number;
  try {
    const now = new Date();
    longDay = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now).toLowerCase();
    shortDay = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now).toLowerCase();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hourNum = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minuteNum = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    minutes = (hourNum === 24 ? 0 : hourNum) * 60 + minuteNum;
  } catch {
    return true;
  }
  const rule = hours[longDay] ?? hours[shortDay];
  if (!rule) {
    return true;
  }
  const open = parseMinutePair(rule.open ?? '');
  const close = parseMinutePair(rule.close ?? '');
  if (open === null || close === null) {
    return true;
  }
  if (open <= close) {
    return minutes >= open && minutes < close;
  }
  return minutes >= open || minutes < close;
}

/** Legacy parity: "08:00 – 20:00 (UTC)" summary of the panel's open window. */
function describeOpenWindow(panel: TicketPanel): string | null {
  const tz = panel.timezone || 'UTC';
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let today: string | null = null;
  try {
    today = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' })
      .format(new Date())
      .toLowerCase();
  } catch {
    today = null;
  }
  const ordered = [...days].sort((a, b) => (a === today ? -1 : b === today ? 1 : 0));
  for (const day of ordered) {
    const rule = panel.hours?.[day];
    if (!rule) {
      continue;
    }
    const open = (rule.open ?? '00:00').trim();
    const close = (rule.close ?? '24:00').trim();
    if (!open || !close) {
      continue;
    }
    const fmt = (value: string) => {
      const [h, m] = value.split(':');
      return `${String(h ?? '00').padStart(2, '0')}:${String(m ?? '00').padStart(2, '0')}`;
    };
    return `**${fmt(open)} – ${fmt(close)}** (${tz})`;
  }
  return null;
}

async function closeTicket(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  ticketId: string,
  reason: string,
): Promise<void> {
  const otDb = await readOpenTickets(context);
  const idx = otDb.tickets.findIndex((t) => t.id === ticketId);

  if (idx === -1) {
    await replyEphemeral(interaction, '❌ سجل التذكرة غير موجود.');
    return;
  }

  const ticket = otDb.tickets[idx];
  if (!ticket) {
    await replyEphemeral(interaction, '❌ سجل التذكرة غير موجود.');
    return;
  }
  const settings = await loadSettings(context);
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === ticket.panelId);
  const panel = panelRecord ? panelOf(panelRecord) : null;

  const isStaffMember = await isStaff(context, interaction, panel, settings);
  const canClose =
    isStaffMember ||
    (asBool(settings.general['ALLOW_USER_CLOSE'], true) && interaction.userId === ticket.userId);
  if (!canClose) {
    await replyEphemeral(interaction, '❌ لا تملك صلاحية إغلاق هذه التذكرة.');
    return;
  }

  const resolvedShouldAskReason = panel
    ? !(panel.hideCloseReason ?? asBool(settings.general['HIDE_CLOSE_REASON_BTN'], false))
    : !asBool(settings.general['HIDE_CLOSE_REASON_BTN'], false);

  if (resolvedShouldAskReason && !reason) {
    const modal: PluginModal = {
      id: `${ID_CLOSE_REASON}${ticketId}`,
      title: 'إغلاق التذكرة',
      fields: [
        {
          id: 'reason',
          label: 'سبب الإغلاق',
          style: 'paragraph',
          required: true,
          maxLength: 300,
        },
      ],
    };
    await interaction.respond({ kind: 'showModal', modal });
    return;
  }

  await interaction.respond({ kind: 'deferReply', ephemeral: true });

  const closedAt = new Date().toISOString();
  const updated: TicketRecord = {
    ...ticket,
    status: 'closed',
    closedAt,
    closedBy: interaction.userId,
    closeReason: reason || null,
  };
  otDb.tickets[idx] = updated;
  await context.storage.set(STORAGE_OPEN_TICKETS, otDb);
  await updateStatsClose(context, ticket, closedAt);

  const transcript = await runTranscript(context, updated, panel, settings);

  await postCloseLog(context, updated, panel, settings, interaction.userId, reason, transcript);

  await sendFeedbackPrompt(context, updated, panel, settings);

  await context.messages
    .sendChannel(
      updated.channelId,
      buildContainer(
        context,
        [
          {
            type: 'text_display',
            content:
              reason.length > 0
                ? `🔒 تم إغلاق التذكرة بواسطة <@${interaction.userId}>\n> ${reason}\n\n-# ستحذف هذه القناة خلال 5 ثوانٍ.`
                : `🔒 تم إغلاق التذكرة بواسطة <@${interaction.userId}>\n\n-# ستحذف هذه القناة خلال 5 ثوانٍ.`,
          },
        ],
        hexToInt(settings.general['COLOR_FAILURE']) ?? ACCENT_NEGATIVE,
      ),
    )
    .catch(() => undefined);

  const deleteKey = `close-delete:${updated.id}`;
  pendingCloseTasks.add(deleteKey);
  context.scheduler.schedule(deleteKey, CLOSE_DELETE_MS, () => {
    pendingCloseTasks.delete(deleteKey);
    void context.channels.delete(updated.channelId, 'Ticket closed').catch(() => undefined);
  });

  await interaction.respond({
    kind: 'editReply',
    message: buildContainer(
      context,
      [{ type: 'text_display', content: '✅ تم إغلاق التذكرة.' }],
      hexToInt(settings.general['COLOR_SUCCESS']) ?? ACCENT_POSITIVE,
    ),
  });
}

/**
 * Legacy parity: adjust channel permissions for all support roles based on claim
 * state. When claimed, the claimer always gets an explicit View/Send/History
 * allow, and each support role loses View/Send when CLAIM_SUPPORT_VIEW or
 * CLAIM_SUPPORT_TYPE is disabled. When unclaimed, support roles are restored
 * and the claimer's member overwrite is dropped.
 */
function buildClaimOverrides(
  context: PluginContext,
  panel: TicketPanel | null,
  settings: TicketSettings,
  ownerId: string,
  members: string[],
  claimerId: string | null,
): Array<{ id: string; type: 'role' | 'member'; allow: bigint; deny: bigint }> {
  const overrides = buildChannelOverrides(context, panel, settings, ownerId, members);

  const supportView = asBool(settings.general['CLAIM_SUPPORT_VIEW'], true);
  const supportType = asBool(settings.general['CLAIM_SUPPORT_TYPE'], true);

  const supportRoles = [...settings.supportRoles, ...(panel?.supportRoles ?? [])].filter(
    (roleId, index, all) => roleId && all.indexOf(roleId) === index,
  );

  // Replace the support-role allow entries produced by the base builder with
  // claim-aware entries (deny bits applied when the corresponding flag is off).
  let cursor = 2; // skip everyone-deny + owner-allow entries
  for (const roleId of supportRoles) {
    const idx = overrides.findIndex((o, i) => i >= cursor && o.id === roleId && o.type === 'role');
    if (idx === -1) {
      continue;
    }
    if (claimerId) {
      // Claimed: support roles keep or lose View/Send per the claim flags.
      let allow = SUPPORT_ALLOW;
      let deny = 0n;
      if (!supportView) {
        allow &= ~VIEW_CHANNEL;
        deny |= VIEW_CHANNEL;
      }
      if (!supportType) {
        allow &= ~SEND_MESSAGES;
        deny |= SEND_MESSAGES;
      }
      overrides[idx] = { id: roleId, type: 'role', allow, deny };
    } else {
      // Unclaimed: restore the original full support allow.
      overrides[idx] = { id: roleId, type: 'role', allow: SUPPORT_ALLOW, deny: 0n };
    }
    cursor = idx + 1;
  }

  if (claimerId) {
    overrides.push({ id: claimerId, type: 'member', allow: ACL_ALLOW, deny: 0n });
  }
  return overrides;
}

async function applyClaimState(
  context: PluginContext,
  ticket: TicketRecord,
  panel: TicketPanel | null,
  settings: TicketSettings,
  claimerId: string | null,
  removedMemberId: string | null = null,
): Promise<void> {
  const members = (ticket.members ?? []).filter((m) => m && m !== removedMemberId);
  const overrides = buildClaimOverrides(context, panel, settings, ticket.userId, members, claimerId);
  await context.channels
    .setPermissions(ticket.channelId, overrides, `Vortex Tickets plugin: ${claimerId ? 'claim' : 'unclaim'} ticket`)
    .catch(() => undefined);
}

async function handleClaim(context: PluginContext, interaction: PluginComponentInteraction, ticketId?: string): Promise<void> {
  const resolvedId = ticketId ?? interaction.customId.slice(ID_CLAIM.length);
  const otDb = await readOpenTickets(context);
  const idx = otDb.tickets.findIndex((t) => t.id === resolvedId);

  if (idx === -1) {
    await replyEphemeral(interaction, '❌ التذكرة غير موجودة.');
    return;
  }

  const ticket = otDb.tickets[idx];
  if (!ticket) {
    await replyEphemeral(interaction, '❌ التذكرة غير موجودة.');
    return;
  }

  const settings = await loadSettings(context);
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === ticket.panelId);
  const panel = panelRecord ? panelOf(panelRecord) : null;

  if (!(await isStaff(context, interaction, panel, settings))) {
    await replyEphemeral(interaction, '❌ لا تملك صلاحية استلام هذه التذكرة.');
    return;
  }

  if (ticket.claimedBy) {
    await replyEphemeral(interaction, `❌ سبق استلامها بواسطة <@${ticket.claimedBy}>.`);
    return;
  }

  otDb.tickets[idx] = {
    ...ticket,
    claimedBy: interaction.userId,
    claimedAt: new Date().toISOString(),
  };
  await context.storage.set(STORAGE_OPEN_TICKETS, otDb);

  // Legacy parity: claimer gains explicit access, support roles are restricted
  // per CLAIM_SUPPORT_VIEW / CLAIM_SUPPORT_TYPE.
  const claimed = otDb.tickets[idx];
  if (claimed) {
    await applyClaimState(context, claimed, panel, settings, interaction.userId);
  }

  const awaitingCat = panel?.awaitingCat ?? null;
  if (awaitingCat) {
    await context.channels
      .moveToCategory(ticket.channelId, awaitingCat)
      .catch(() => undefined);
  }

  await interaction.respond({
    kind: 'reply',
    message: buildContainer(
      context,
      [{ type: 'text_display', content: `🙋 تم استلام التذكرة بواسطة <@${interaction.userId}>` }],
      ACCENT_CLAIM,
    ),
  });
}

async function handleUnclaim(context: PluginContext, interaction: PluginComponentInteraction, ticketId?: string): Promise<void> {
  const resolvedId = ticketId ?? interaction.customId.slice(ID_UNCLAIM.length);
  const otDb = await readOpenTickets(context);
  const idx = otDb.tickets.findIndex((t) => t.id === resolvedId);

  if (idx === -1) {
    await replyEphemeral(interaction, '❌ التذكرة غير موجودة.');
    return;
  }

  const ticket = otDb.tickets[idx];
  if (!ticket) {
    await replyEphemeral(interaction, '❌ التذكرة غير موجودة.');
    return;
  }

  const settings = await loadSettings(context);
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === ticket.panelId);
  const claimedBy = ticket.claimedBy ?? null;

  // Legacy parity: only the claimer themselves or a server admin can unclaim —
  // regular staff who did not claim the ticket cannot.
  const isAdmin = await context.guild.hasPermission(interaction.userId, 'ManageGuild').catch(() => false);
  if (interaction.userId !== claimedBy && !isAdmin) {
    await replyEphemeral(
      interaction,
      claimedBy
        ? `❌ فقط الموظف الذي استلم التذكرة (<@${claimedBy}>) أو الإدارة يمكنهم إلغاء الاستلام.`
        : '❌ لم يتم استلام هذه التذكرة.',
    );
    return;
  }

  otDb.tickets[idx] = { ...ticket, claimedBy: null, claimedAt: null };
  await context.storage.set(STORAGE_OPEN_TICKETS, otDb);

  // Legacy parity: restore full support-role access and drop the claimer's
  // member overwrite entirely.
  const unclaimed = otDb.tickets[idx];
  if (unclaimed) {
    await applyClaimState(context, unclaimed, panelRecord ? panelOf(panelRecord) : null, settings, null, claimedBy);
  }

  await interaction.respond({
    kind: 'reply',
    message: buildContainer(
      context,
      [{ type: 'text_display', content: `↩️ تم إلغاء استلام التذكرة بواسطة <@${interaction.userId}>` }],
      ACCENT_UNCLAIM,
    ),
  });
}

async function handleAddRemoveButton(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  mode: 'add' | 'remove',
  ticketId?: string,
): Promise<void> {
  const resolvedId = ticketId ?? interaction.customId.slice(mode === 'add' ? ID_ADD.length : ID_REMOVE.length);
  const otDb = await readOpenTickets(context);
  const ticket = otDb.tickets.find((t) => t.id === resolvedId);
  const settings = await loadSettings(context);
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === ticket?.panelId);

  if (!(await isStaff(context, interaction, panelRecord ? panelOf(panelRecord) : null, settings))) {
    await replyEphemeral(
      interaction,
      mode === 'add'
        ? '❌ لا تملك صلاحية إضافة أعضاء إلى هذه التذكرة.'
        : '❌ لا تملك صلاحية إزالة أعضاء من هذه التذكرة.',
    );
    return;
  }

  await interaction.respond({ kind: 'showModal', modal: buildMemberModal(mode, resolvedId) });
}

function buildMemberModal(mode: 'add' | 'remove', ticketId: string): PluginModal {
  return {
    id: `${mode === 'add' ? ID_ADD_MODAL : ID_REMOVE_MODAL}${ticketId}`,
    title: mode === 'add' ? 'إضافة عضو إلى التذكرة' : 'إزالة عضو من التذكرة',
    fields: [
      {
        id: 'userid',
        label: 'معرف المستخدم أو @mention',
        style: 'short',
        required: true,
        maxLength: 30,
      },
    ],
  };
}

async function handleAddRemoveModal(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  mode: 'add' | 'remove',
  ticketId: string,
): Promise<void> {
  const raw = asString(interaction.modalFields?.['userid']).replace(/\D/g, '');

  const otDb = await readOpenTickets(context);
  const idx = otDb.tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) {
    await replyEphemeral(interaction, '❌ التذكرة غير موجودة.');
    return;
  }
  const ticket = otDb.tickets[idx];
  if (!ticket) {
    await replyEphemeral(interaction, '❌ التذكرة غير موجودة.');
    return;
  }

  if (mode === 'remove' && ticket.userId === raw) {
    await replyEphemeral(interaction, '❌ لا يمكن إزالة مالك التذكرة.');
    return;
  }

  if (mode === 'add' && raw) {
    const member = await context.guild.fetchMember(raw).catch(() => null);
    if (!member) {
      await replyEphemeral(interaction, `❌ تعذر العثور على عضو بالمعرف \`${raw}\`.`);
      return;
    }
  }

  const settings = await loadSettings(context);
  const panelRecord = settings.panels.find((p) => asStr(p?.['id']) === ticket.panelId);

  const members = Array.isArray(ticket.members) ? [...ticket.members] : [];
  if (mode === 'add') {
    if (raw && !members.includes(raw)) {
      members.push(raw);
    }
  } else {
    const pos = members.indexOf(raw);
    if (pos !== -1) {
      members.splice(pos, 1);
    }
  }
  otDb.tickets[idx] = { ...ticket, members };
  await context.storage.set(STORAGE_OPEN_TICKETS, otDb);

  const overrides = buildChannelOverrides(context, panelRecord ? panelOf(panelRecord) : null, settings, ticket.userId, members);
  try {
    await context.channels.setPermissions(ticket.channelId, overrides, `Vortex Tickets plugin: ${mode} member ${raw}`);
    if (mode === 'add') {
      await interaction.respond({
        kind: 'reply',
        message: buildContainer(
          context,
          [{ type: 'text_display', content: `✅ تمت إضافة <@${raw}> إلى هذه التذكرة.` }],
          ACCENT_ADD,
        ),
        ephemeral: true,
      });
    } else {
      await interaction.respond({
        kind: 'reply',
        message: buildContainer(
          context,
          [{ type: 'text_display', content: `✅ تمت إزالة <@${raw}> من هذه التذكرة.` }],
          ACCENT_REMOVE,
        ),
      });
    }
  } catch {
    await replyEphemeral(interaction, `❌ تعذر ${mode === 'add' ? 'إضافة' : 'إزالة'} العضو بالمعرف \`${raw}\`.`);
  }
}

async function handleActionSelect(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const ticketId = interaction.customId.slice(ID_ACTION_SEL.length);
  const action = firstSelected(interaction);
  if (action === 'close') {
    await closeTicket(context, interaction, ticketId, '');
    return;
  }
  if (action === 'claim') {
    await handleClaim(context, interaction, ticketId);
    return;
  }
  if (action === 'unclaim') {
    await handleUnclaim(context, interaction, ticketId);
    return;
  }
  if (action === 'add') {
    await handleAddRemoveButton(context, interaction, 'add', ticketId);
    return;
  }
  if (action === 'remove') {
    await handleAddRemoveButton(context, interaction, 'remove', ticketId);
    return;
  }
  await replyEphemeral(interaction, '❌ إجراء غير معروف.');
}

async function handleRulesButton(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const settings = await loadSettings(context);
  const rulesText = asStr(settings.general['RULES_BTN_TEXT']);
  if (!rulesText) {
    await replyEphemeral(interaction, '❌ لم يتم إعداد نص القواعد بعد.');
    return;
  }
  await interaction.respond({
    kind: 'reply',
    message: buildContainer(context, [
      { type: 'text_display', content: '## 📜 قواعد السيرفر' },
      { type: 'separator' },
      { type: 'text_display', content: rulesText },
    ], hexToInt(settings.general['COLOR_SUCCESS']) ?? ACCENT_RULES),
    ephemeral: true,
  });
}

async function handleEscalateButton(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const ticketId = interaction.customId.slice(ID_ESCALATE.length);
  const settings = await loadSettings(context);
  const cats = gLineList(settings.general['ESCALATE_CATEGORIES']);
  if (cats.length === 0) {
    await replyEphemeral(interaction, '❌ لم يتم إعداد تصنيفات للتصعيد.');
    return;
  }

  // Legacy parity: when ESCALATE_ROLES is configured, only members holding one
  // of those roles may escalate the ticket.
  const allowedRoles = gLineList(settings.general['ESCALATE_ROLES']);
  if (allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((roleId) => interaction.memberRoleIds.includes(roleId));
    if (!hasRole) {
      await replyEphemeral(interaction, '❌ لا تملك صلاحية تصعيد هذه التذكرة.');
      return;
    }
  }

  // Legacy parity: resolve category names from the guild channel list.
  const options = await Promise.all(
    cats.slice(0, 125).map(async (id) => {
      const channel = await context.channels.describe(id).catch(() => null);
      return { id, name: channel?.name || id };
    }),
  );
  const chunks = chunk(options, 25);

  const items: Cv2Item[] = [
    { type: 'text_display', content: '### ⬆️ تصعيد التذكرة\nاختر تصنيفًا لنقل التذكرة إليه.' },
    { type: 'separator' },
  ];
  for (let ci = 0; ci < Math.min(chunks.length, 5); ci++) {
    const optionsChunk = chunks[ci] ?? [];
    const select: Cv2Select = {
      type: 'select',
      id: `${ID_ESCALATE_SEL}${ci}_${ticketId}`,
      placeholder: chunks.length > 1 ? `الفئات ${ci * 25 + 1}–${ci * 25 + optionsChunk.length}` : 'اختر فئة...',
      options: optionsChunk.map((c) => ({ label: c.name.substring(0, 100), value: c.id })),
    };
    items.push(select);
  }

  await interaction.respond({
    kind: 'reply',
    message: buildContainer(context, items, ACCENT_ESCALATE),
    ephemeral: true,
  });
}

async function handleEscalateSelect(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const categoryId = firstSelected(interaction);
  if (!categoryId) {
    await replyEphemeral(interaction, '❌ لم يتم تحديد تصنيف.');
    return;
  }

  try {
    await context.channels.moveToCategory(interaction.channelId, categoryId);

    const otDb = await readOpenTickets(context);
    const idx = otDb.tickets.findIndex((t) => t.channelId === interaction.channelId);
    if (idx !== -1) {
      const record = otDb.tickets[idx];
      if (record) {
        otDb.tickets[idx] = { ...record, escalated: true };
        await context.storage.set(STORAGE_OPEN_TICKETS, otDb);
      }
    }

    // Legacy parity: show the resolved category name in the confirmation.
    const channel = await context.channels.describe(categoryId).catch(() => null);
    await interaction.respond({
      kind: 'reply',
      message: buildContainer(
        context,
        [{ type: 'text_display', content: `✅ تم نقل التذكرة إلى **${channel?.name ?? categoryId}**` }],
        ACCENT_POSITIVE,
      ),
      ephemeral: true,
    });
  } catch (err) {
    context.logger.error('Escalate error', { error: getErrorMessage(err) });
    await replyEphemeral(interaction, '❌ فشل نقل التذكرة. تأكد من أن البوت يملك صلاحية **إدارة القنوات**.');
  }
}

async function handleMpRefresh(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const mpId = interaction.customId.slice(ID_MP_REFRESH.length);
  const settings = await loadSettings(context);
  const mpRecord = settings.multiPanels.find((m) => asStr(m?.['id']) === mpId);
  if (!mpRecord) {
    await replyEphemeral(interaction, '❌ الباقة المتعددة غير موجودة.');
    return;
  }

  const mp = multiPanelOf(mpRecord);
  const panels = resolveMultiPanels(settings, mp);
  if (panels.length === 0) {
    await replyEphemeral(interaction, '❌ لا توجد بانلات في هذه الباقة المتعددة.');
    return;
  }

  await interaction.respond({
    kind: 'reply',
    message: buildMultiPanelMessage(context, mp, panels),
    ephemeral: true,
  });
}

async function handleFeedbackButton(context: PluginContext, interaction: PluginComponentInteraction): Promise<void> {
  const rest = interaction.customId.slice(ID_FB.length);
  const partsStr = rest.split(':');
  const guildId = partsStr[0] ?? '';
  const ratingStr = partsStr.at(-1) ?? '';
  const rating = Math.min(Math.max(parseInt(ratingStr, 10) || 1, 1), 5);
  const ticketId = partsStr.slice(1, -1).join(':');

  const otDb = await readOpenTickets(context);
  const ticket = otDb.tickets.find((t) => t.id === ticketId) ?? null;
  const settings = await loadSettings(context);
  const panel = ticket ? settings.panels.find((p) => asStr(p?.['id']) === ticket.panelId) ?? null : null;

  // Legacy parity: feedback copy switches on general.LANGUAGE ('en' → English).
  const s = feedbackI18n(settings.general['LANGUAGE']);

  const accent =
    rating >= 4 ? ('success' as const) : rating >= 3 ? ('primary' as const) : ('danger' as const);
  const accentColor = rating >= 4 ? ACCENT_POSITIVE : rating >= 3 ? ACCENT_NEUTRAL : ACCENT_NEGATIVE;
  const stars = '⭐'.repeat(rating);

  const buttons: Cv2Button[] = [1, 2, 3, 4, 5].map((n) => ({
    type: 'button',
    id: `${ID_FB}${guildId}:${ticketId}:${n}`,
    label: '⭐'.repeat(n),
    style: n === rating ? accent : 'secondary',
    disabled: true,
  }));

  await interaction.respond({
    kind: 'update',
    message: buildContainer(
      context,
      [{ type: 'text_display', content: `## ${stars} ${s.ratingReceived}` }, ...buttons],
      accentColor,
    ),
  });

  if (!ticket) {
    return;
  }

  const feedback = (await context.storage.get<FeedbackData>(STORAGE_FEEDBACK)) ?? DEFAULT_FEEDBACK;
  feedback.entries.push({
    ticketId,
    panelId: ticket.panelId,
    userId: interaction.userId,
    rating,
    comment: '',
    submittedAt: new Date().toISOString(),
  });
  await context.storage.set(STORAGE_FEEDBACK, feedback);

  await awardRatingPoints(context, ticket.claimedBy, rating, ticketId, interaction.userId);

  const panelOfTicket = panel ? panelOf(panel) : null;
  const feedbackChannel = panelOfTicket?.feedbackChannel;
  if (feedbackChannel) {
    try {
      const claimerMention = ticket.claimedBy ? `<@${ticket.claimedBy}>` : null;
      const contentLines = [
        `${s.ticketLabel} \`${ticketId}\``,
        `${s.userLabel} <@${interaction.userId}>`,
        claimerMention ? `${s.claimerLabel} ${claimerMention}` : null,
        `${s.ratingLabel} ${stars}`,
      ].filter((line): line is string => typeof line === 'string');
      const card = buildContainer(
        context,
        [
          {
            type: 'text_display',
            content: `## ${s.newFeedback}${claimerMention ? ` ${claimerMention}` : ''}`,
          },
          { type: 'separator' },
          { type: 'text_display', content: contentLines.join('\n') },
        ],
        accentColor,
      );
      const receipt = await context.messages.sendChannel(feedbackChannel, card).catch(() => null);
      if (receipt) {
        await context.messages
          .createThread(feedbackChannel, receipt.id, `${s.threadName} — ${ticketId}`)
          .catch(() => null);
      }
    } catch (err) {
      context.logger.error('Feedback result error', { error: getErrorMessage(err) });
    }
  }
}

interface FeedbackStrings {
  ratingReceived: string;
  newFeedback: string;
  ticketLabel: string;
  userLabel: string;
  claimerLabel: string;
  ratingLabel: string;
  commentLabel: string;
  threadName: string;
}

/** Legacy parity: feedback copy is Arabic by default and English when LANGUAGE === 'en'. */
function feedbackI18n(lang: unknown): FeedbackStrings {
  const isEn = lang === 'en';
  return {
    ratingReceived: isEn ? 'Your rating has been received' : 'تم استلام تقييمك',
    newFeedback: isEn ? '📩 New Feedback Received' : '📩 تقييم جديد مستلم',
    ticketLabel: isEn ? '**Ticket:**' : '**التذكرة:**',
    userLabel: isEn ? '**User:**' : '**المستخدم:**',
    claimerLabel: isEn ? '**Received by:**' : '**مستلم التذكرة:**',
    ratingLabel: isEn ? '**Rating:**' : '**التقييم:**',
    commentLabel: isEn ? '**Comment:**' : '**التعليق:**',
    threadName: isEn ? 'Feedback Thread' : 'خيط التقييم',
  };
}

function buildWelcomeItems(
  panel: TicketPanel,
  settings: TicketSettings,
  username: string,
  record: TicketRecord,
): Cv2Item[] {
  const items: Cv2Item[] = [];

  if (panel.welcomeAuthor) {
    items.push({ type: 'text_display', content: `-# ${panel.welcomeAuthor}` });
  }

  const wTitle = (panel.welcomeTitle || `تذكرة \`#${String(record.number).padStart(4, '0')}\``)
    .replace('{user}', username)
    .replace('{number}', String(record.number).padStart(4, '0'));
  items.push({ type: 'text_display', content: `## ${wTitle}` });

  const wDesc = (panel.welcomeDesc || 'فريق الدعم سيتواصل معك قريبًا. يرجى وصف مشكلتك.')
    .replace('{user}', `<@${record.userId}>`)
    .replace('{username}', username)
    .replace('{number}', String(record.number).padStart(4, '0'));
  items.push({ type: 'text_display', content: wDesc });

  items.push({ type: 'separator' });

  const hideClose = panel.hideClose ?? asBool(settings.general['HIDE_CLOSE_BTN'], false);
  const hideClaim = panel.hideClaim ?? asBool(settings.general['HIDE_CLAIM_BTN'], false);
  const actionBtns = panel.actionBtns || {};
  const actionMode = panel.actionBtnsMode || 'buttons';

  const actions: ActionDef[] = [];
  if (!hideClose) {
    actions.push({ key: 'close', id: `${ID_CLOSE}${record.id}`, label: 'إغلاق', defEmoji: '🔒', defStyle: 'danger' });
  }
  if (!hideClaim) {
    actions.push(
      { key: 'claim', id: `${ID_CLAIM}${record.id}`, label: 'استلام', defEmoji: '🙋', defStyle: 'primary' },
      { key: 'unclaim', id: `${ID_UNCLAIM}${record.id}`, label: 'إلغاء الاستلام', defEmoji: '↩️', defStyle: 'secondary' },
    );
  }
  actions.push(
    { key: 'add', id: `${ID_ADD}${record.id}`, label: 'إضافة عضو', defEmoji: '➕', defStyle: 'secondary' },
    { key: 'remove', id: `${ID_REMOVE}${record.id}`, label: 'إزالة عضو', defEmoji: '➖', defStyle: 'secondary' },
  );

  const rulesEnabled =
    asBool(settings.general['RULES_BTN_ENABLED'], false) && asStr(settings.general['RULES_BTN_TEXT']).length > 0;
  const escalateEnabled =
    asBool(settings.general['ESCALATE_ENABLED'], false) && gLineList(settings.general['ESCALATE_CATEGORIES']).length > 0;

  const rulesButton = (): Cv2Button => {
    const rEmoji = asStr(settings.general['RULES_BTN_EMOJI']).trim();
    const rStyle = btnStyle(gNum(settings.general['RULES_BTN_STYLE'], 2)) || 'secondary';
    const rLabel = asStr(settings.general['RULES_BTN_LABEL']).trim() || 'القواعد';
    const btn: Cv2Button = {
      type: 'button',
      id: `${ID_RULES}${record.guildId}`,
      label: rLabel.substring(0, 80),
      style: rStyle,
    };
    btn.emoji = rEmoji || '📜';
    return btn;
  };

  if (actionMode === 'select') {
    const options = actions.map((a) => {
      const cfg = actionBtns[a.key] || {};
      const emoji = (cfg.emoji || '').trim() || a.defEmoji;
      const option: Cv2SelectOption = { label: a.label, value: a.key };
      if (emoji) {
        option.emoji = emoji;
      }
      return option;
    });
    const menu: Cv2Select = {
      type: 'select',
      id: `${ID_ACTION_SEL}${record.id}`,
      placeholder: '⚙️ إجراءات...',
      options,
    };
    items.push(menu);

    const extraButtons: Cv2Button[] = [];
    if (rulesEnabled) {
      extraButtons.push(rulesButton());
    }
    if (escalateEnabled) {
      extraButtons.push({ type: 'button', id: `${ID_ESCALATE}${record.id}`, label: '⬆️ تصعيد', style: 'secondary' });
    }
    if (extraButtons.length > 0) {
      for (const row of chunk(extraButtons, 5)) {
        items.push(...row);
      }
    }
  } else {
    const buttons: Cv2Button[] = actions.map((a) => {
      const cfg = actionBtns[a.key] || {};
      const rawEmoji = (cfg.emoji || '').trim();
      const labelMode = cfg.labelMode || 'both';
      const style = btnStyle(cfg.style) || a.defStyle;
      let displayLabel: string;
      if (labelMode === 'emoji_only') {
        displayLabel = rawEmoji || a.defEmoji;
      } else if (labelMode === 'text_only') {
        displayLabel = a.label;
      } else {
        displayLabel = rawEmoji ? `${rawEmoji} ${a.label}` : `${a.defEmoji} ${a.label}`;
      }
      return { type: 'button', id: a.id, label: displayLabel.substring(0, 80), style };
    });

    if (rulesEnabled) {
      buttons.push(rulesButton());
    }
    if (escalateEnabled) {
      buttons.push({ type: 'button', id: `${ID_ESCALATE}${record.id}`, label: '⬆️ تصعيد', style: 'secondary' });
    }

    for (const row of chunk(buttons, 5)) {
      items.push(...row);
    }
  }

  const footerParts: string[] = [];
  if (panel.welcomeFooter) {
    footerParts.push(panel.welcomeFooter);
  }
  if (panel.welcomeTimestamp) {
    footerParts.push(`<t:${Math.floor(Date.now() / 1000)}:f>`);
  }
  if (footerParts.length > 0) {
    items.push({ type: 'text_display', content: `-# ${footerParts.join('  •  ')}` });
  }

  const mentions: string[] = [];
  if (panel.mentionRole) {
    mentions.push(`<@&${panel.mentionRole}>`);
  }
  for (const roleId of settings.supportRoles) {
    if (roleId) {
      mentions.push(`<@&${roleId}>`);
    }
  }
  if (mentions.length > 0) {
    items.push({ type: 'text_display', content: mentions.join(' ') });
  }

  return items;
}

async function sendWelcomeMessage(
  context: PluginContext,
  channelId: string,
  panel: TicketPanel,
  settings: TicketSettings,
  username: string,
  record: TicketRecord,
): Promise<void> {
  await context.messages
    .sendChannel(
      channelId,
      buildContainer(context, buildWelcomeItems(panel, settings, username, record), welcomeAccent(panel, settings)),
    )
    .catch(() => undefined);
}

function buildSinglePanelMessage(context: PluginContext, panel: TicketPanel): CoreMessage {
  const items: Cv2Item[] = [];

  const banner = resolveBanner(panel.bannerImage);
  if (banner) {
    items.push({ type: 'media', url: banner });
  }
  if (panel.panelTitle) {
    items.push({ type: 'text_display', content: `## ${panel.panelTitle}` });
  }
  if (panel.description) {
    items.push({ type: 'text_display', content: panel.description });
  }
  items.push({ type: 'separator' });

  if (panel.useSelectMenu) {
    const option: Cv2SelectOption = {
      label: (panel.btnText || panel.panelTitle || 'فتح تذكرة').substring(0, 100),
      value: `${ID_OPEN}${panel.id}`,
    };
    if (panel.btnEmoji) {
      option.emoji = panel.btnEmoji;
    }
    if (panel.selectMenuDesc) {
      option.description = panel.selectMenuDesc.substring(0, 50);
    }
    const menu: Cv2Select = {
      type: 'select',
      id: `${ID_MP_SELECT}${panel.id}`,
      placeholder: (panel.selectMenuPlaceholder || 'اختر فئة...').substring(0, 150),
      options: [option],
    };
    items.push(menu);
  } else {
    const button: Cv2Button = {
      type: 'button',
      id: `${ID_OPEN}${panel.id}`,
      label: (panel.btnText || 'فتح تذكرة').substring(0, 80),
      style: btnStyle(gNum(panel.btnColor, 1)) || 'primary',
    };
    if (panel.btnEmoji) {
      button.emoji = panel.btnEmoji;
    }
    items.push(button);
  }

  return buildContainer(context, items, hexToInt(panel.panelColor));
}

function buildMultiPanelMessage(context: PluginContext, mp: MultiPanel, panels: ResolvedPanel[]): CoreMessage {
  const items: Cv2Item[] = [];

  const banner = resolveBanner(mp.bannerImage);
  if (banner) {
    items.push({ type: 'media', url: banner });
  }
  if (mp.panelTitle) {
    items.push({ type: 'text_display', content: `## ${mp.panelTitle}` });
  }
  if (mp.description) {
    items.push({ type: 'text_display', content: mp.description });
  }
  items.push({ type: 'separator' });

  if (mp.useDropdown) {
    const usedValues = new Set<string>();
    const options: Cv2SelectOption[] = panels.slice(0, 25).map((p, i) => {
      const baseId = p.panelId || p.id || '';
      let value = `${ID_OPEN}${baseId || `${mp.id}_${i}`}`;
      if (usedValues.has(value)) {
        value = `${ID_OPEN}${mp.id}_${i}`;
      }
      usedValues.add(value);
      const option: Cv2SelectOption = {
        label: (p.overrideBtnText || p.btnText || p.panelTitle || p.name || 'بانل').substring(0, 100),
        value,
      };
      const emoji = p.overrideBtnEmoji || p.btnEmoji;
      if (emoji) {
        option.emoji = emoji;
      }
      return option;
    });

    const menu: Cv2Select = {
      type: 'select',
      id: `${ID_MP_SELECT}${mp.id}`,
      placeholder: (mp.placeholder || 'اختر فئة...').substring(0, 150),
      options,
    };
    items.push(menu);

    if (mp.showRefreshBtn) {
      const button: Cv2Button = {
        type: 'button',
        id: `${ID_MP_REFRESH}${mp.id}`,
        label: (mp.refreshBtnLabel || '🔄 تحديث').substring(0, 80),
        style: 'secondary',
      };
      items.push(button);
    }
  } else {
    const capped = panels.slice(0, 25);
    const buttons: Cv2Button[] = capped.map((p, absIdx) => {
      const baseId = p.panelId || p.id || '';
      const button: Cv2Button = {
        type: 'button',
        id: `${ID_OPEN}${baseId || `${mp.id}_${absIdx}`}`,
        label: (p.overrideBtnText || p.btnText || p.panelTitle || p.name || 'فتح').substring(0, 80),
        style: btnStyle(gNum(p.overrideBtnColor ?? p.btnColor, 1)) || 'primary',
      };
      const emoji = p.overrideBtnEmoji || p.btnEmoji;
      if (emoji) {
        button.emoji = emoji;
      }
      return button;
    });
    for (const row of chunk(buttons, 5)) {
      items.push(...row);
    }
  }

  return buildContainer(context, items, hexToInt(mp.accentColor));
}

function resolveBanner(bannerImage: string): string | null {
  if (!bannerImage) {
    return null;
  }
  if (bannerImage.startsWith('http://') || bannerImage.startsWith('https://')) {
    return bannerImage;
  }
  return null;
}

function resolveMultiPanels(settings: TicketSettings, mp: MultiPanel): ResolvedPanel[] {
  const fullPanels = settings.panels.map((p) => panelOf(p));
  return (mp.panels || []).map((slot, i) => {
    const slotId = asStr(slot?.['panelId']);
    const slotName = asStr(slot?.['name']);
    const full =
      (slotId && fullPanels.find((p) => p.id === slotId)) ||
      fullPanels.find((p) => (p.name || p.panelTitle) === slotName);
    if (full) {
      return {
        ...full,
        ...slot,
        panelId: full.id,
      };
    }
    return { ...slot, _slotIndex: i };
  }) as ResolvedPanel[];
}

async function refreshPanels(context: PluginContext): Promise<void> {
  const settings = await loadSettings(context);
  for (const panel of settings.panels) {
    await ensurePanel(context, settings, panel);
  }
  for (const mp of settings.multiPanels) {
    await ensureMultiPanel(context, settings, mp);
  }
}

async function ensurePanel(
  context: PluginContext,
  settings: TicketSettings,
  panel: Record<string, unknown>,
): Promise<void> {
  const p = panelOf(panel);
  const channelId = p.panelChannel;
  if (!channelId) {
    return;
  }
  const payloadKey = panelContentKey(p);
  const now = Date.now();
  if (
    panel['messageId'] &&
    panel['postedAt'] &&
    now - new Date(asStr(panel['postedAt'])).getTime() < PANEL_FRESH_MS &&
    panel['postedKey'] === payloadKey
  ) {
    return;
  }
  if (panel['messageId']) {
    await context.messages.delete(channelId, asStr(panel['messageId'])).catch(() => undefined);
  }
  const receipt = await context.messages.sendChannel(channelId, buildSinglePanelMessage(context, p)).catch(() => null);
  if (receipt) {
    panel['messageId'] = receipt.id;
    panel['postedKey'] = payloadKey;
    panel['postedAt'] = new Date().toISOString();
  } else {
    panel['messageId'] = null;
    panel['postedKey'] = null;
    panel['postedAt'] = null;
  }
  await context.storage.set(STORAGE_SETTINGS, settings);
}

async function ensureMultiPanel(
  context: PluginContext,
  settings: TicketSettings,
  mp: Record<string, unknown>,
): Promise<void> {
  const m = multiPanelOf(mp);
  const channelId = m.channel;
  if (!channelId) {
    return;
  }
  const panels = resolveMultiPanels(settings, m);
  if (panels.length === 0) {
    return;
  }
  const payloadKey = multiPanelContentKey(m, panels);
  const now = Date.now();
  if (
    mp['messageId'] &&
    mp['postedAt'] &&
    now - new Date(asStr(mp['postedAt'])).getTime() < PANEL_FRESH_MS &&
    mp['postedKey'] === payloadKey
  ) {
    return;
  }
  if (mp['messageId']) {
    await context.messages.delete(channelId, asStr(mp['messageId'])).catch(() => undefined);
  }
  const receipt = await context.messages
    .sendChannel(channelId, buildMultiPanelMessage(context, m, panels))
    .catch(() => null);
  if (receipt) {
    mp['messageId'] = receipt.id;
    mp['postedKey'] = payloadKey;
    mp['postedAt'] = new Date().toISOString();
  } else {
    mp['messageId'] = null;
    mp['postedKey'] = null;
    mp['postedAt'] = null;
  }
  await context.storage.set(STORAGE_SETTINGS, settings);
}

function panelContentKey(panel: TicketPanel): string {
  return JSON.stringify([
    panel.panelTitle,
    panel.description,
    panel.bannerImage,
    panel.useSelectMenu,
    panel.selectMenuPlaceholder,
    panel.selectMenuDesc,
    panel.btnText,
    panel.btnEmoji,
    panel.btnColor,
    panel.panelColor,
  ]);
}

function multiPanelContentKey(mp: MultiPanel, panels: ResolvedPanel[]): string {
  return JSON.stringify([
    mp.panelTitle,
    mp.description,
    mp.bannerImage,
    mp.useDropdown,
    mp.placeholder,
    mp.showRefreshBtn,
    mp.refreshBtnLabel,
    mp.accentColor,
    panels.map((p) => [
      p.panelId || p.id,
      p.overrideBtnText || p.btnText || p.panelTitle || p.name,
      p.overrideBtnEmoji || p.btnEmoji,
      p.overrideBtnColor ?? p.btnColor,
    ]),
  ]);
}

async function runTranscript(
  context: PluginContext,
  ticket: TicketRecord,
  panel: TicketPanel | null,
  settings: TicketSettings,
): Promise<{ fileName: string; html: string } | null> {
  if (!panel?.transcriptEnabled) {
    return null;
  }

  const messages = await context.messages
    .readChannel(ticket.channelId, 5000)
    .catch(() => [] as PluginMessageEntry[]);
  const html = buildTranscriptHtml(ticket, panel, [...messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt)));
  const fileName = `transcript-${ticket.id}.html`;

  const transcripts = (await context.storage.get<Record<string, string>>(STORAGE_TRANSCRIPTS)) ?? {};
  transcripts[fileName] = html;
  await context.storage.set(STORAGE_TRANSCRIPTS, transcripts);

  const rawId = panel.transcriptChannel;
  const transcriptChannelId =
    !rawId || rawId === 'global' ? asNullableStr(settings.general['TRANSCRIPTS_CHANNEL']) : rawId;

  let transcriptChannelMsgId: string | null = null;
  if (transcriptChannelId) {
    const card = buildContainer(
      context,
      [
        {
          type: 'text_display',
          content: `## 📄 نسخة التذكرة — \`#${String(ticket.number ?? ticket.id).padStart(4, '0')}\``,
        },
        { type: 'separator' },
        {
          type: 'text_display',
          content: [
            `> **المستخدم:** <@${ticket.userId}>`,
            `> **البانل:** ${panel.panelTitle || ticket.panelId || '—'}`,
            `> **أغلق:** <t:${Math.floor(Date.now() / 1000)}:f>`,
            `> **السبب:** ${ticket.closeReason || '—'}`,
          ].join('\n'),
        },
      ],
      ACCENT_PANEL,
    );
    const receipt = await context.messages.sendChannel(transcriptChannelId, card).catch(() => null);
    transcriptChannelMsgId = receipt?.id ?? null;
    await context.messages
      .sendFile(transcriptChannelId, { name: fileName, data: html })
      .catch(() => undefined);
  }

  if (panel.transcriptDm) {
    const dmCard = buildContainer(
      context,
      [
        { type: 'text_display', content: '## 📄 نسختك الخاصة بالتذكرة' },
        { type: 'separator' },
        {
          type: 'text_display',
          content: [
            `تم إغلاق تذكرتك \`#${String(ticket.number ?? ticket.id).padStart(4, '0')}\` من **${panel.panelTitle || 'الدعم'}**.`,
            ticket.closeReason ? `\n> **السبب:** ${ticket.closeReason}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      ACCENT_POSITIVE,
    );
    await context.messages.sendDirect(ticket.userId, dmCard).catch(() => undefined);
    await context.messages
      .sendDirectFile(ticket.userId, { name: fileName, data: html })
      .catch(() => undefined);
  }

  const otDb = await readOpenTickets(context);
  const idx = otDb.tickets.findIndex((t) => t.id === ticket.id);
  const existing = otDb.tickets[idx];
  if (existing) {
    otDb.tickets[idx] = {
      ...existing,
      transcriptPath: fileName,
      transcriptChannelMsgId,
    };
    await context.storage.set(STORAGE_OPEN_TICKETS, otDb);
  }

  return { fileName, html };
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatContent(value: string): string {
  if (!value) {
    return '';
  }
  return escapeHtml(value)
    .replace(/```([a-z]*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^&gt;\s(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\|\|(.+?)\|\|/g, '<span style="background:#202225;border-radius:3px">$1</span>');
}

function buildTranscriptHtml(ticket: TicketRecord, panel: TicketPanel, messages: PluginMessageEntry[]): string {
  const title = `تذكرة #${String(ticket.number ?? ticket.id).padStart(4, '0')} — ${panel.panelTitle || ''}`;

  const messageRows = messages
    .map((m) => {
      const iso = new Date(m.sentAt).toLocaleString('en-GB', { hour12: false });
      const author = escapeHtml(m.authorName || 'Unknown');
      const avatar = m.authorAvatarUrl ?? '';
      const body = formatContent(m.content);
      return `    <div class="msg">
      <img class="av" src="${escapeHtml(avatar)}" alt="${author}" loading="lazy" />
      <div class="body">
        <span class="author">${author}</span>
        <span class="ts" title="${escapeHtml(m.sentAt)}">${iso}</span>
        ${body ? `<div class="content">${body}</div>` : ''}
      </div>
    </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #313338; --surface: #2b2d31; --elevated: #232428;
      --text: #dbdee1; --muted: #80848e; --accent: #5865f2;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg); color: var(--text);
      font: 15px/1.6 "gg sans","Noto Sans",system-ui,sans-serif;
      padding: 24px 32px;
    }
    header {
      display: flex; align-items: flex-start; gap: 16px;
      border-left: 4px solid var(--accent); padding: 14px 18px;
      background: var(--surface); border-radius: 6px; margin-bottom: 28px;
    }
    header .meta h1 { font-size: 1.15rem; color: #fff; }
    header .meta p  { font-size: .82rem; color: var(--muted); margin-top: 4px; }
    .msg {
      display: flex; gap: 14px; padding: 6px 4px; border-radius: 4px;
      transition: background .1s;
    }
    .msg:hover { background: var(--surface); }
    .av  { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
    .body { flex: 1; min-width: 0; }
    .author { font-weight: 600; color: #fff; }
    .ts     { font-size: .75rem; color: var(--muted); margin-left: 8px; }
    .content { white-space: pre-wrap; word-break: break-word; color: var(--text); margin-top: 2px; }
    code { background: var(--elevated); padding: 1px 5px; border-radius: 4px; font-size: .88em; }
    pre  { background: var(--elevated); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: .88em; margin-top: 4px; }
    blockquote { border-left: 3px solid var(--muted); padding-left: 10px; color: var(--muted); }
    footer { margin-top: 40px; text-align: center; font-size: .78rem; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <div class="meta">
      <h1>📄 ${escapeHtml(title)}</h1>
      <p>
        المستخدم: ${escapeHtml(ticket.userId)} &nbsp;|&nbsp;
        البانل: ${escapeHtml(panel.panelTitle || '')} &nbsp;|&nbsp;
        الرسائل: ${messages.length} &nbsp;|&nbsp;
        فتحت: ${ticket.openedAt ? new Date(ticket.openedAt).toLocaleString('en-GB') : '—'} &nbsp;|&nbsp;
        أغلقت: ${ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('en-GB') : '—'}
      </p>
    </div>
  </header>

  <div class="messages">
${messageRows || '    <p style="color:var(--muted);padding:12px">لا توجد رسائل.</p>'}
  </div>

  <footer>تم الإنشاء بواسطة نظام التذاكر &nbsp;|&nbsp; ${new Date().toUTCString()}</footer>
</body>
</html>`;
}

async function postCloseLog(
  context: PluginContext,
  ticket: TicketRecord,
  panel: TicketPanel | null,
  settings: TicketSettings,
  actorId: string,
  reason: string,
  transcript: { fileName: string; html: string } | null = null,
): Promise<void> {
  const logChannelId =
    panel?.logChannel || settings.logChannel || asNullableStr(settings.general['NOTIFICATION_CHANNEL']);
  if (!logChannelId) {
    return;
  }

  const openedTs = ticket.openedAt ? Math.floor(new Date(ticket.openedAt).getTime() / 1000) : null;
  const closedTs = ticket.closedAt
    ? Math.floor(new Date(ticket.closedAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const ticketNum = `\`#${String(ticket.number ?? ticket.id).padStart(4, '0')}\``;
  const actorMention = `<@${actorId}>`;

  const lines = [
    `> **التذكرة:** ${ticketNum}`,
    `> **فتح بواسطة:** <@${ticket.userId}>`,
    `> **البانل:** ${panel?.panelTitle || ticket.panelId || '—'}`,
    `> **القناة:** ${ticket.channelId ? `<#${ticket.channelId}>` : '*(محذوفة)*'}`,
  ];
  if (ticket.claimedBy) {
    lines.push(`> **مستلم بواسطة:** <@${ticket.claimedBy}>`);
  } else {
    lines.push('> **مستلم بواسطة:** —');
  }
  lines.push(`> **أغلق بواسطة:** ${actorMention}`, `> **السبب:** ${reason || '—'}`);
  if (openedTs) {
    lines.push(`> **الفتح:** <t:${openedTs}:f>`);
  }
  lines.push(`> **الإغلاق:** <t:${closedTs}:f>`);

  await context.messages
    .sendChannel(
      logChannelId,
      buildContainer(
        context,
        [
          { type: 'text_display', content: `## 🔒 تذكرة مغلقة — ${ticketNum}` },
          { type: 'separator' },
          { type: 'text_display', content: lines.join('\n') },
        ],
        ACCENT_NEGATIVE,
      ),
    )
    .catch(() => undefined);

  if (transcript) {
    // Legacy parity: caption + file as a plain follow-up so Discord delivers it.
    await context.messages
      .sendFile(
        logChannelId,
        { name: transcript.fileName, data: transcript.html },
        `📎 نسخة التذكرة \`#${String(ticket.number ?? ticket.id).padStart(4, '0')}\``,
      )
      .catch(() => undefined);
  }
}

async function sendFeedbackPrompt(
  context: PluginContext,
  ticket: TicketRecord,
  panel: TicketPanel | null,
  settings: TicketSettings,
): Promise<void> {
  if (!panel?.feedbackEnabled && !asBool(settings.general['ENABLE_FEEDBACK'], false)) {
    return;
  }

  const items: Cv2Item[] = [];
  items.push({
    type: 'text_display',
    content: `## 📝 كيف كانت تجربتك؟\nقم بتقييم تجربة الدعم مع **${panel?.panelTitle || 'فريقنا'}**.`,
  });
  items.push({ type: 'separator' });
  if (ticket.claimedBy) {
    items.push({ type: 'text_display', content: `<@${ticket.claimedBy}>` });
  }
  for (const n of [1, 2, 3, 4, 5]) {
    items.push({
      type: 'button',
      id: `${ID_FB}${context.guildId}:${ticket.id}:${n}`,
      label: '⭐'.repeat(n),
      style: 'secondary',
    });
  }

  await context.messages
    .sendDirect(ticket.userId, buildContainer(context, items, ACCENT_FEEDBACK_PROMPT))
    .catch(() => undefined);
}

async function updateStatsClose(context: PluginContext, record: TicketRecord, closedAt: string): Promise<void> {
  const stats = await readStats(context);
  stats.closed_today = (stats.closed_today || 0) + 1;
  if (record.openedAt && closedAt) {
    const responseMs = new Date(closedAt).getTime() - new Date(record.openedAt).getTime();
    if (responseMs > 0) {
      const n = (stats.total_closed || 0) + 1;
      stats.avg_response_ms = Math.round(((stats.avg_response_ms || 0) * (n - 1) + responseMs) / n);
      stats.total_closed = n;
    }
  }
  await context.storage.set(STORAGE_STATS, stats);
}

async function readStats(context: PluginContext): Promise<StatsState> {
  const stats = (await context.storage.get<Partial<StatsState>>(STORAGE_STATS)) ?? {};
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastReset = stats.last_reset_date ?? '';
  const closedToday = lastReset !== todayStr ? 0 : stats.closed_today ?? 0;
  return {
    avg_response_ms: toFinite(stats.avg_response_ms, 0),
    total_closed: toFinite(stats.total_closed, 0),
    last_reset_date: todayStr,
    closed_today: toFinite(closedToday, 0),
  };
}

function toFinite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

async function readOpenTickets(context: PluginContext): Promise<OpenTicketsData> {
  const stored = await context.storage.get<OpenTicketsData>(STORAGE_OPEN_TICKETS);
  if (stored && Array.isArray(stored.tickets)) {
    return { tickets: stored.tickets, nextNumber: stored.nextNumber ?? stored.tickets.length + 1 };
  }
  return { tickets: [], nextNumber: 1 };
}

async function nextTicketNumber(context: PluginContext): Promise<number> {
  const db = await readOpenTickets(context);
  return db.nextNumber ?? db.tickets.length + 1;
}

async function loadSettings(context: PluginContext): Promise<TicketSettings> {
  const stored = (await context.storage.get<Partial<TicketSettings>>(STORAGE_SETTINGS)) ?? {};
  const general = { ...DEFAULT_GENERAL, ...(stored.general ?? {}) };
  return {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : false,
    general,
    panels: Array.isArray(stored.panels) ? stored.panels : [],
    multiPanels: Array.isArray(stored.multiPanels) ? stored.multiPanels : [],
    supportRoles: Array.isArray(stored.supportRoles)
      ? stored.supportRoles.filter((r): r is string => typeof r === 'string')
      : [],
    logChannel: typeof stored.logChannel === 'string' ? stored.logChannel : null,
  };
}

async function isStaff(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  panel: TicketPanel | null,
  settings: TicketSettings,
): Promise<boolean> {
  const globalRoles = settings.supportRoles;
  const panelRoles = panel?.supportRoles ?? [];
  if (globalRoles.length === 0 && panelRoles.length === 0) {
    const manage = await context.guild.hasPermission(interaction.userId, 'ManageGuild').catch(() => false);
    if (manage) {
      return true;
    }
  }
  if (globalRoles.some((r) => interaction.memberRoleIds.includes(r))) {
    return true;
  }
  if (panelRoles.some((r) => interaction.memberRoleIds.includes(r))) {
    return true;
  }
  return false;
}

function passesAcl(interaction: PluginComponentInteraction, acl: TicketPanel['acl']): boolean {
  if (!Array.isArray(acl) || acl.length === 0) {
    return true;
  }
  const denies = acl.filter((r) => r?.action === 'deny');
  const allows = acl.filter((r) => r?.action === 'allow');
  for (const rule of denies) {
    if (matchesRule(interaction, rule)) {
      return false;
    }
  }
  if (allows.length > 0) {
    return allows.some((r) => matchesRule(interaction, r));
  }
  return true;
}

function matchesRule(
  interaction: PluginComponentInteraction,
  rule: { action?: string; type?: string; target?: string },
): boolean {
  if (rule?.type === 'user') {
    return interaction.userId === rule.target;
  }
  if (rule?.type === 'role') {
    return rule.target ? interaction.memberRoleIds.includes(rule.target) : false;
  }
  return false;
}

function buildChannelName(
  panel: TicketPanel,
  settings: TicketSettings,
  username: string,
  number: number,
  userId: string,
): string {
  const mode = panel.namingMode || 'global';
  const globalScheme = asStr(settings.general['NAMING_SCHEME']) || 'ticket-{number}';
  const template = mode === 'custom' ? panel.namingCustom || globalScheme : globalScheme;
  const sanitized = template
    .replace('{number}', String(number).padStart(4, '0'))
    .replace('{username}', username.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .replace('{userid}', userId)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return sanitized || `ticket-${String(number).padStart(4, '0')}`;
}

function buildChannelOverrides(
  context: PluginContext,
  panel: TicketPanel | null,
  settings: TicketSettings,
  ownerId: string,
  members: string[],
): Array<{ id: string; type: 'role' | 'member'; allow: bigint; deny: bigint }> {
  const overrides: Array<{ id: string; type: 'role' | 'member'; allow: bigint; deny: bigint }> = [
    { id: context.guildId, type: 'role', allow: 0n, deny: VIEW_CHANNEL },
    { id: ownerId, type: 'member', allow: MEMBER_ALLOW, deny: 0n },
  ];
  for (const roleId of settings.supportRoles) {
    if (roleId) {
      overrides.push({ id: roleId, type: 'role', allow: SUPPORT_ALLOW, deny: 0n });
    }
  }
  for (const roleId of panel?.supportRoles ?? []) {
    if (roleId) {
      overrides.push({ id: roleId, type: 'role', allow: SUPPORT_ALLOW, deny: 0n });
    }
  }
  for (const rule of panel?.acl ?? []) {
    if (rule?.action === 'allow' && rule.type === 'role' && rule.target) {
      overrides.push({ id: rule.target, type: 'role', allow: ACL_ALLOW, deny: 0n });
    }
  }
  for (const memberId of members) {
    if (memberId) {
      overrides.push({ id: memberId, type: 'member', allow: ACL_ALLOW, deny: 0n });
    }
  }
  return overrides;
}

function createTicketChannel(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  panel: TicketPanel,
  settings: TicketSettings,
): Promise<{ channelId: string; number: number } | null> {
  return (async () => {
    const guildId = context.guildId;
    const ticketNumber = await nextTicketNumber(context);
    const userRecord = await context.guild.fetchUser(interaction.userId).catch(() => null);
    const username = userRecord?.username ?? interaction.userId;
    const channelName = buildChannelName(panel, settings, username, ticketNumber, interaction.userId);

    const overrides = buildChannelOverrides(context, panel, settings, interaction.userId, []);
    const categoryId = panel.category || asNullableStr(settings.general['CHANNEL_CATEGORY']);
    const topic = `تذكرة لـ ${userRecord?.displayName || interaction.userId} | فتحت: ${new Date().toUTCString()}`;

    const createOptions: PluginChannelCreateOptions = {
      name: channelName,
      permissionOverrides: overrides,
      reason: 'Ticket opened',
      ...(categoryId ? { categoryId } : {}),
    };
    if (topic) {
      createOptions.topic = topic;
    }

    let channel = null;
    if (panel.threadMode) {
      const parentId = panel.panelChannel || asNullableStr(settings.general['PANEL_CHANNEL']);
      if (!parentId) {
        return null;
      }
      channel = await context.channels
        .createPrivateThread(parentId, {
          name: channelName,
          invitable: false,
          reason: 'Ticket opened',
          memberIds: [interaction.userId],
        })
        .catch(() => null);
    } else {
      channel = await context.channels.createText(createOptions).catch(() => null);
    }
    if (!channel) {
      return null;
    }

    if (panel.threadMode && panel.threadNotifChannel) {
      await context.messages
        .sendChannel(
          panel.threadNotifChannel,
          buildContainer(
            context,
            [
              {
                type: 'text_display',
                content: `🎫 فتحت تذكرة جديدة بواسطة <@${interaction.userId}>: <#${channel.id}>`,
              },
            ],
            hexToInt(panel.panelColor) ?? ACCENT_POSITIVE,
          ),
        )
        .catch(() => undefined);
    }

    const ticketId = `tkt_${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const record: TicketRecord = {
      id: ticketId,
      number: ticketNumber,
      panelId: panel.id,
      guildId,
      channelId: channel.id,
      userId: interaction.userId,
      claimedBy: null,
      status: 'open',
      openedAt: new Date().toISOString(),
      closedAt: null,
      closedBy: null,
      closeReason: null,
      transcriptPath: null,
      transcriptChannelMsgId: null,
      members: [],
    };

    const otDb = await readOpenTickets(context);
    otDb.tickets.push(record);
    otDb.nextNumber = ticketNumber + 1;
    await context.storage.set(STORAGE_OPEN_TICKETS, otDb);

    await sendWelcomeMessage(context, channel.id, panel, settings, username, record);

    return { channelId: channel.id, number: ticketNumber };
  })();
}

function buildContainer(context: PluginContext, items: Cv2Item[], accentColor?: number): CoreMessage {
  return context.components.build({
    components: [
      {
        type: 'container',
        items,
        ...(accentColor === undefined ? {} : { accentColor }),
      },
    ],
  });
}

function hexToInt(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const clean = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return undefined;
  }
  return parseInt(clean, 16);
}

function openSuccessAccent(panel: TicketPanel, settings: TicketSettings): number {
  return (
    hexToInt(panel.welcomeColor) ??
    hexToInt(settings.general['COLOR_SUCCESS']) ??
    ACCENT_POSITIVE
  );
}

function welcomeAccent(panel: TicketPanel, settings: TicketSettings): number {
  return (
    hexToInt(panel.welcomeColor) ??
    hexToInt(panel.panelColor) ??
    hexToInt(settings.general['COLOR_SUCCESS']) ??
    ACCENT_PANEL
  );
}

function panelOf(panel: Record<string, unknown>): TicketPanel {
  const r = panel ?? {};
  return {
    id: asStr(r['id']),
    name: asStr(r['name']),
    panelTitle: asStr(r['panelTitle']),
    panelChannel: asNullableStr(r['panelChannel']),
    threadNotifChannel: asNullableStr(r['threadNotifChannel']),
    category: asNullableStr(r['category']),
    mentionRole: asNullableStr(r['mentionRole']),
    transcriptChannel: asNullableStr(r['transcriptChannel']),
    threadMode: asBool(r['threadMode'], false),
    cooldown: gNum(r['cooldown'], 0),
    maxOpen: gNum(r['maxOpen'], 0),
    hideClose: r['hideClose'] === null || r['hideClose'] === undefined ? null : asBool(r['hideClose'], false),
    hideCloseReason:
      r['hideCloseReason'] === null || r['hideCloseReason'] === undefined
        ? null
        : asBool(r['hideCloseReason'], false),
    hideClaim: r['hideClaim'] === null || r['hideClaim'] === undefined ? null : asBool(r['hideClaim'], false),
    disabled: asBool(r['disabled'], false),
    alwaysOpen: asBool(r['alwaysOpen'], true),
    timezone: asStr(r['timezone']) || 'UTC',
    hours:
      typeof r['hours'] === 'object' && r['hours'] !== null
        ? (r['hours'] as Record<string, { open?: string; close?: string }>)
        : {},
    acl: Array.isArray(r['acl']) ? (r['acl'] as TicketPanel['acl']) : [],
    supportRoles: Array.isArray(r['supportRoles'])
      ? r['supportRoles'].filter((x): x is string => typeof x === 'string')
      : [],
    formEnabled: asBool(r['formEnabled'], false),
    formQuestions: Array.isArray(r['formQuestions']) ? (r['formQuestions'] as TicketPanel['formQuestions']) : [],
    transcriptEnabled: asBool(r['transcriptEnabled'], false),
    transcriptDm: asBool(r['transcriptDm'], false),
    feedbackEnabled: asBool(r['feedbackEnabled'], false),
    feedbackChannel: asNullableStr(r['feedbackChannel']),
    namingMode: asStr(r['namingMode']) || 'global',
    namingCustom: asStr(r['namingCustom']),
    useSelectMenu: asBool(r['useSelectMenu'], false),
    selectMenuPlaceholder: asStr(r['selectMenuPlaceholder']),
    selectMenuDesc: asStr(r['selectMenuDesc']),
    btnText: asStr(r['btnText']),
    btnEmoji: asStr(r['btnEmoji']),
    btnColor: r['btnColor'] === null || r['btnColor'] === undefined ? null : gNum(r['btnColor'], 1),
    bannerImage: asStr(r['bannerImage']),
    description: asStr(r['description']),
    panelColor: asNullableStr(r['panelColor']),
    welcomeColor: asNullableStr(r['welcomeColor']),
    welcomeTitle: asStr(r['welcomeTitle']),
    welcomeDesc: asStr(r['welcomeDesc']),
    welcomeFooter: asStr(r['welcomeFooter']),
    welcomeTimestamp: asBool(r['welcomeTimestamp'], false),
    welcomeAuthor: asStr(r['welcomeAuthor']),
    actionBtnsMode: asStr(r['actionBtnsMode']) || 'buttons',
    actionBtns:
      typeof r['actionBtns'] === 'object' && r['actionBtns'] !== null
        ? (r['actionBtns'] as Record<string, { emoji?: string; style?: number; labelMode?: string }>)
        : {},
    awaitingCat: asNullableStr(r['awaitingCat']),
    logChannel: asNullableStr(r['logChannel']),
  };
}

function multiPanelOf(mp: Record<string, unknown>): MultiPanel {
  const r = mp ?? {};
  return {
    id: asStr(r['id']),
    channel: asNullableStr(r['channel']),
    panelTitle: asStr(r['panelTitle']),
    description: asStr(r['description']),
    accentColor: asNullableStr(r['accentColor']),
    bannerImage: asStr(r['bannerImage']),
    useDropdown: asBool(r['useDropdown'], false),
    placeholder: asStr(r['placeholder']),
    showRefreshBtn: asBool(r['showRefreshBtn'], false),
    refreshBtnLabel: asStr(r['refreshBtnLabel']),
    panels: Array.isArray(r['panels'])
      ? r['panels'].filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
      : [],
  };
}

function btnStyle(value: number | null | undefined): 'primary' | 'secondary' | 'success' | 'danger' | null {
  if (typeof value !== 'number') {
    return null;
  }
  return BTN_STYLE[String(value)] ?? null;
}

function parseMinutePair(value: string): number | null {
  const parts = value.split(':');
  const h = parseInt(parts[0] ?? '', 10);
  const m = parseInt(parts[1] ?? '', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }
  return h * 60 + m;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function firstSelected(interaction: PluginComponentInteraction): string | null {
  if (!interaction.selectedValues || interaction.selectedValues.length === 0) {
    return null;
  }
  return interaction.selectedValues[0] ?? null;
}

function asStr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function gNum(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

/** Parse a value that may be an array or a multiline string (one entry per line). */
function gLineList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => asString(x).trim()).filter((x) => x.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  return [];
}

async function loadStaffPointsConfig(context: PluginContext): Promise<StaffPointsConfig> {
  const stored = (await context.storage.get<Partial<StaffPointsConfig>>(STORAGE_STAFF_POINTS)) ?? {};
  return mergeDeep(
    DEFAULT_STAFF_POINTS as unknown as Record<string, unknown>,
    stored as unknown as Record<string, unknown>,
  ) as unknown as StaffPointsConfig;
}

function mergeDeep(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const ov = override[key];
    const bv = base[key];
    if (
      ov !== null &&
      typeof ov === 'object' &&
      !Array.isArray(ov) &&
      bv !== null &&
      typeof bv === 'object' &&
      !Array.isArray(bv)
    ) {
      out[key] = mergeDeep(bv as Record<string, unknown>, ov as Record<string, unknown>);
    } else {
      out[key] = ov;
    }
  }
  return out;
}

async function awardRatingPoints(
  context: PluginContext,
  claimedById: string | null | undefined,
  rating: number,
  ticketId: string,
  voterId: string,
): Promise<void> {
  if (!claimedById) {
    return;
  }
  const config = await loadStaffPointsConfig(context);
  if (!config.enabled || !config.ratingPoints?.enabled) {
    return;
  }
  if (config.antiAbuse?.enabled && config.antiAbuse?.noSelfRate && voterId === claimedById) {
    return;
  }

  const ratings = config.ratingPoints.stars ?? {};
  const clamped = Math.min(5, Math.max(1, Math.round(rating)));
  const delta = gNum(ratings[String(clamped)], 0);
  if (delta === 0) {
    return;
  }

  const scores = (await context.storage.get<StaffScores>(STORAGE_STAFF_SCORES)) ?? {};

  const dedupeKey = `rate_${voterId}_${ticketId}`;
  if (config.antiAbuse?.enabled && config.antiAbuse?.noDuplicatePoints) {
    if (scores[claimedById]?.lastActions?.[dedupeKey]) {
      return;
    }
    if (!scores[claimedById]) {
      scores[claimedById] = { points: 0, history: [], lastActions: {} };
    }
    const staffEntry = scores[claimedById];
    if (staffEntry) {
      if (!staffEntry.lastActions) {
        staffEntry.lastActions = {};
      }
      staffEntry.lastActions[dedupeKey] = new Date().toISOString();
      await context.storage.set(STORAGE_STAFF_SCORES, scores);
    }
  }

  await awardStaffPoints(context, config, claimedById, delta, `تقييم التذكرة (${'⭐'.repeat(clamped)})`, {
    ticketId,
    voterId,
    rating: clamped,
  });
}

async function awardStaffPoints(
  context: PluginContext,
  config: StaffPointsConfig,
  staffId: string,
  delta: number,
  reason: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const scores = (await context.storage.get<StaffScores>(STORAGE_STAFF_SCORES)) ?? {};
  if (!scores[staffId]) {
    scores[staffId] = { points: 0, history: [], lastActions: {} };
  }
  const entry = scores[staffId];
  if (!entry) {
    return;
  }
  entry.points = (entry.points || 0) + delta;
  if (!Array.isArray(entry.history)) {
    entry.history = [];
  }
  entry.history.push({ delta, reason, ...meta, at: new Date().toISOString() });
  if (entry.history.length > 100) {
    entry.history = entry.history.slice(-100);
  }
  await context.storage.set(STORAGE_STAFF_SCORES, scores);

  if (config.logsChannelId) {
    await sendStaffPointsLog(context, config.logsChannelId, staffId, delta, reason, entry.points).catch(
      () => undefined,
    );
  }
  if (config.rewards?.enabled && (config.rewards.list?.length ?? 0) > 0) {
    await checkStaffRewards(context, config, staffId, entry.points).catch(() => undefined);
  }
}

async function sendStaffPointsLog(
  context: PluginContext,
  channelId: string,
  staffId: string,
  delta: number,
  reason: string,
  totalPoints: number,
): Promise<void> {
  const isPos = delta >= 0;
  const sign = isPos ? '+' : '';
  await context.messages.sendChannel(
    channelId,
    buildContainer(
      context,
      [
        { type: 'text_display', content: `## ${isPos ? '📈' : '📉'} تحديث نقاط الإدارة` },
        { type: 'separator' },
        {
          type: 'text_display',
          content: `<@${staffId}> — **${sign}${delta} نقطة**\n-# ${reason} • الرصيد الكلي: **${totalPoints} نقطة**`,
        },
      ],
      isPos ? ACCENT_POSITIVE : ACCENT_NEGATIVE,
    ),
  );
}

async function checkStaffRewards(
  context: PluginContext,
  config: StaffPointsConfig,
  staffId: string,
  totalPoints: number,
): Promise<void> {
  for (const reward of config.rewards.list ?? []) {
    if (!reward.points || totalPoints < reward.points) {
      continue;
    }
    if (reward.roleId) {
      await context.guild.addRole(staffId, reward.roleId).catch(() => false);
    }
    if (config.logsChannelId && (reward.roleId || reward.label)) {
      const rolePart = reward.roleId ? `\n<@&${reward.roleId}>` : '';
      const labelPart = reward.label ? `\n-# ${reward.label}` : '';
      await context.messages
        .sendChannel(
          config.logsChannelId,
          buildContainer(
            context,
            [
              { type: 'text_display', content: '## 🏅 مكافأة نقاط الإدارة' },
              { type: 'separator' },
              {
                type: 'text_display',
                content: `<@${staffId}> وصل إلى **${reward.points} نقطة**!${rolePart}${labelPart}`,
              },
            ],
            ACCENT_REWARD,
          ),
        )
        .catch(() => undefined);
    }
  }
}

function text(content: string): CoreMessage {
  return { type: 'text', content };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function replyEphemeral(interaction: PluginComponentInteraction, content: string): Promise<void> {
  await interaction.respond({ kind: 'reply', message: text(content), ephemeral: true }).catch(() => undefined);
}

async function editReplyEphemeral(interaction: PluginComponentInteraction, content: string): Promise<void> {
  await interaction.respond({ kind: 'editReply', message: text(content) }).catch(() => undefined);
}