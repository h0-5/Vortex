import type {
  PluginComponentInteraction,
  PluginContext,
  PluginEventPayload,
  PluginModule,
} from '@vortex/core';
import type {
  ComponentsV2Button,
  ComponentsV2Container,
  ComponentsV2Item,
  ComponentsV2Message,
} from '@vortex/types';

type SuggestionStatus = 'pending' | 'active' | 'accepted' | 'rejected' | 'considered';
type VotingType = 'upvote_downvote' | 'multiple_reactions' | 'buttons';

interface StatusTag {
  label: string;
  color: string;
}

interface StatusTags {
  accepted: StatusTag;
  rejected: StatusTag;
  considered: StatusTag;
}

interface VotingSettings {
  enabled: boolean;
  type: VotingType;
  upvoteEmoji: string;
  downvoteEmoji: string;
  multipleReactions: string[];
}

interface AutoThresholdSettings {
  enabled: boolean;
  minUpvotes: number;
  minDownvotes: number;
}

interface PermissionSettings {
  allowAll: boolean;
  allowedRoles: string[];
  minAccountAge: number;
  minServerLevel: number;
}

interface SpamSettings {
  cooldown: number;
  maxPerDay: number;
}

interface ModerationSettings {
  requireApproval: boolean;
  pendingChannel: string | null;
  requireRejectReason: boolean;
}

interface Settings {
  enabled: boolean;
  channel: string | null;
  allowThreads: boolean;
  voting: VotingSettings;
  autoThreshold: AutoThresholdSettings;
  permissions: PermissionSettings;
  spam: SpamSettings;
  moderation: ModerationSettings;
  statusTags: StatusTags;
}

interface SuggestionRecord {
  id: number;
  messageId: string | null;
  pendingMessageId: string | null;
  submitterId: string;
  memberTag: string;
  avatarUrl: string;
  content: string;
  status: SuggestionStatus;
  upvotes: number;
  downvotes: number;
  voters: Record<string, 'up' | 'down'>;
  reactions: Record<string, string[]>;
  createdAt: number;
  threadId: string | null;
  moderator?: string | undefined;
  rejectReason?: string | null | undefined;
  autoModerated?: boolean | undefined;
}

interface SuggestionData {
  suggestions: Record<string, SuggestionRecord>;
  userCooldowns: Record<string, { lastSuggestion: number; todayCount: number; todayDate: string }>;
  nextId: number;
  _pendingRejects: Record<string, unknown>;
}

interface LevelsEntry {
  textLevel?: number | undefined;
  voiceLevel?: number | undefined;
  textMessages?: number | undefined;
}

const DATA_KEY = 'suggestions_data';
const LEVELS_KEY = 'levels';

const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  channel: null,
  allowThreads: false,
  voting: {
    enabled: true,
    type: 'upvote_downvote',
    upvoteEmoji: '👍',
    downvoteEmoji: '👎',
    multipleReactions: ['👍', '👎'],
  },
  autoThreshold: {
    enabled: false,
    minUpvotes: 10,
    minDownvotes: 5,
  },
  permissions: {
    allowAll: true,
    allowedRoles: [],
    minAccountAge: 0,
    minServerLevel: 0,
  },
  spam: {
    cooldown: 10,
    maxPerDay: 3,
  },
  moderation: {
    requireApproval: false,
    pendingChannel: null,
    requireRejectReason: true,
  },
  statusTags: {
    accepted: { label: 'تم القبول', color: '#22c55e' },
    rejected: { label: 'تم الرفض', color: '#ef4444' },
    considered: { label: 'قيد الدراسة', color: '#f59e0b' },
  },
};

function createEmptyData(): SuggestionData {
  return { suggestions: {}, userCooldowns: {}, nextId: 1, _pendingRejects: {} };
}

function defaultData(): SuggestionData {
  return { suggestions: {}, userCooldowns: {}, nextId: 1, _pendingRejects: {} };
}

export default {
  async onInstall(context: PluginContext): Promise<void> {
    const existing = await context.storage.get<Settings>('settings');
    if (!existing) {
      await context.storage.set('settings', DEFAULT_SETTINGS);
    }
    const data = await context.storage.get<SuggestionData>(DATA_KEY);
    if (!data) {
      await context.storage.set(DATA_KEY, createEmptyData());
    }
    await context.logger.info('Suggestions plugin installed with default settings.');
  },

  async onEnable(context: PluginContext): Promise<void> {
    const data = (await context.storage.get<SuggestionData>(DATA_KEY)) ?? defaultData();
    for (const id of Object.keys(data.suggestions)) {
      registerSuggestionHandlers(context, Number(id));
    }

    context.events.on('messageCreate', (payload) => {
      void handleMessageCreate(context, payload);
    });
    context.events.on('messageReactionAdd', (payload) => {
      void handleReactionAdd(context, payload);
    });
    context.events.on('messageReactionRemove', (payload) => {
      void handleReactionRemove(context, payload);
    });

    await context.logger.info('Suggestions plugin enabled.');
  },
} satisfies PluginModule;

// ── Storage helpers ────────────────────────────────────────────

async function loadSettings(context: PluginContext): Promise<Settings> {
  const stored = await context.storage.get<Partial<Settings>>('settings');
  const merged = mergeSettings(stored ?? {});
  return merged;
}

function mergeSettings(stored: Partial<Settings>): Settings {
  return {
    enabled: stored.enabled ?? DEFAULT_SETTINGS.enabled,
    channel: stored.channel ?? DEFAULT_SETTINGS.channel,
    allowThreads: stored.allowThreads ?? DEFAULT_SETTINGS.allowThreads,
    voting: {
      enabled: stored.voting?.enabled ?? DEFAULT_SETTINGS.voting.enabled,
      type: stored.voting?.type ?? DEFAULT_SETTINGS.voting.type,
      upvoteEmoji: stored.voting?.upvoteEmoji ?? DEFAULT_SETTINGS.voting.upvoteEmoji,
      downvoteEmoji: stored.voting?.downvoteEmoji ?? DEFAULT_SETTINGS.voting.downvoteEmoji,
      multipleReactions: normalizeStringList(
        stored.voting?.multipleReactions ?? DEFAULT_SETTINGS.voting.multipleReactions,
      ),
    },
    autoThreshold: {
      enabled: stored.autoThreshold?.enabled ?? DEFAULT_SETTINGS.autoThreshold.enabled,
      minUpvotes: stored.autoThreshold?.minUpvotes ?? DEFAULT_SETTINGS.autoThreshold.minUpvotes,
      minDownvotes:
        stored.autoThreshold?.minDownvotes ?? DEFAULT_SETTINGS.autoThreshold.minDownvotes,
    },
    permissions: {
      allowAll: stored.permissions?.allowAll ?? DEFAULT_SETTINGS.permissions.allowAll,
      allowedRoles: normalizeStringList(
        stored.permissions?.allowedRoles ?? DEFAULT_SETTINGS.permissions.allowedRoles,
      ),
      minAccountAge: stored.permissions?.minAccountAge ?? DEFAULT_SETTINGS.permissions.minAccountAge,
      minServerLevel:
        stored.permissions?.minServerLevel ?? DEFAULT_SETTINGS.permissions.minServerLevel,
    },
    spam: {
      cooldown: stored.spam?.cooldown ?? DEFAULT_SETTINGS.spam.cooldown,
      maxPerDay: stored.spam?.maxPerDay ?? DEFAULT_SETTINGS.spam.maxPerDay,
    },
    moderation: {
      requireApproval:
        stored.moderation?.requireApproval ?? DEFAULT_SETTINGS.moderation.requireApproval,
      pendingChannel: stored.moderation?.pendingChannel ?? DEFAULT_SETTINGS.moderation.pendingChannel,
      requireRejectReason:
        stored.moderation?.requireRejectReason ?? DEFAULT_SETTINGS.moderation.requireRejectReason,
    },
    statusTags: {
      accepted: {
        label: stored.statusTags?.accepted?.label ?? DEFAULT_SETTINGS.statusTags.accepted.label,
        color: stored.statusTags?.accepted?.color ?? DEFAULT_SETTINGS.statusTags.accepted.color,
      },
      rejected: {
        label: stored.statusTags?.rejected?.label ?? DEFAULT_SETTINGS.statusTags.rejected.label,
        color: stored.statusTags?.rejected?.color ?? DEFAULT_SETTINGS.statusTags.rejected.color,
      },
      considered: {
        label: stored.statusTags?.considered?.label ?? DEFAULT_SETTINGS.statusTags.considered.label,
        color: stored.statusTags?.considered?.color ?? DEFAULT_SETTINGS.statusTags.considered.color,
      },
    },
  };
}

function normalizeStringList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => entry.trim()).filter(Boolean);
  }
  return value
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function loadData(context: PluginContext): Promise<SuggestionData> {
  const stored = await context.storage.get<SuggestionData>(DATA_KEY);
  if (stored && stored.suggestions && typeof stored.nextId === 'number') {
    stored.userCooldowns ??= {};
    stored._pendingRejects ??= {};
    return stored;
  }
  const fresh = defaultData();
  await context.storage.set(DATA_KEY, fresh);
  return fresh;
}

async function saveData(context: PluginContext, data: SuggestionData): Promise<void> {
  await context.storage.set(DATA_KEY, data);
}

// ── Card builders (Components V2) ─────────────────────────────

function text(content: string) {
  return { type: 'text_display' as const, content };
}

function separator() {
  return { type: 'separator' as const, spacing: 'small' as const, divider: true };
}

function media(url: string) {
  return { type: 'media' as const, url, spoiler: false };
}

function button(config: Omit<ComponentsV2Button, 'type' | 'disabled'>): ComponentsV2Button {
  return { type: 'button', disabled: false, ...config };
}

function statusLabel(status: SuggestionStatus, settings: Settings): string {
  if (status === 'accepted') return `✅  ${settings.statusTags.accepted.label}`;
  if (status === 'rejected') return `❌  ${settings.statusTags.rejected.label}`;
  if (status === 'considered') return `🔍  ${settings.statusTags.considered.label}`;
  if (status === 'pending') return '⏳  بانتظار مراجعة الإدارة';
  return '';
}

function buildCard(
  suggestion: SuggestionRecord,
  settings: Settings,
  includeButtons: boolean,
): ComponentsV2Container {
  const items: ComponentsV2Item[] = [];

  const header = [
    `## 💡  الاقتراح #${suggestion.id}`,
    `-# 👤 مقدم من **${suggestion.memberTag || 'غير معروف'}**`,
  ].join('\n');
  items.push(text(header));

  if (suggestion.avatarUrl) {
    items.push(media(suggestion.avatarUrl));
  }
  items.push(separator());
  items.push(text('> ' + suggestion.content.replace(/\n/g, '\n> ')));
  items.push(separator());

  const lines: string[] = [];
  const label = statusLabel(suggestion.status, settings);
  if (label) lines.push(label);

  const voting = settings.voting;
  if (voting.enabled) {
    if (voting.type === 'upvote_downvote') {
      const upE = voting.upvoteEmoji || '👍';
      const downE = voting.downvoteEmoji || '👎';
      lines.push(`${upE} **${suggestion.upvotes ?? 0}**  ·  ${downE} **${suggestion.downvotes ?? 0}**`);
    } else if (voting.type === 'multiple_reactions') {
      const rxLine = Object.entries(suggestion.reactions || {})
        .map(([em, voters]) => `${em} **${voters.length}**`)
        .join('  ·  ');
      if (rxLine) lines.push(rxLine);
    }
  }
  lines.push(`-# 🆔  #${suggestion.id}`);
  items.push(text(lines.join('\n')));

  if (voting.enabled && voting.type === 'buttons' && suggestion.status === 'active' && includeButtons) {
    items.push(
      button({ id: `sg_vote_up_${suggestion.id}`, label: `👍  ${suggestion.upvotes ?? 0}`, style: 'success' }),
      button({ id: `sg_vote_down_${suggestion.id}`, label: `👎  ${suggestion.downvotes ?? 0}`, style: 'danger' }),
    );
  }

  return { type: 'container', items, spoiler: false };
}

function buildPendingCard(suggestion: SuggestionRecord): ComponentsV2Container {
  const items: ComponentsV2Item[] = [];

  const header = [
    `## ⏳  بانتظار المراجعة`,
    `**الاقتراح #${suggestion.id}**`,
    `-# 👤 من **${suggestion.memberTag || 'غير معروف'}**`,
  ].join('\n');
  items.push(text(header));

  if (suggestion.avatarUrl) {
    items.push(media(suggestion.avatarUrl));
  }
  items.push(separator());
  items.push(text('> ' + suggestion.content.replace(/\n/g, '\n> ')));
  items.push(separator());
  items.push(
    button({ id: `sg_accept_${suggestion.id}`, label: '✅  قبول', style: 'success' }),
    button({ id: `sg_reject_${suggestion.id}`, label: '❌  رفض', style: 'danger' }),
    button({ id: `sg_consider_${suggestion.id}`, label: '🔍  قيد الدراسة', style: 'secondary' }),
  );

  return { type: 'container', items, spoiler: false };
}

function buildOutcomeCard(
  suggestion: SuggestionRecord,
  moderatorTag: string,
  reason: string,
): ComponentsV2Container {
  const emoji =
    { accepted: '✅', rejected: '❌', considered: '🔍' }[
      suggestion.status as 'accepted' | 'rejected' | 'considered'
    ] || '📋';
  const label =
    {
      accepted: 'تم القبول',
      rejected: 'تم الرفض',
      considered: 'قيد الدراسة',
    }[suggestion.status as 'accepted' | 'rejected' | 'considered'] || 'اقتراح';

  const lines = [
    `## ${emoji}  الاقتراح #${suggestion.id} — ${label}`,
    `-# راجعه **${moderatorTag}**`,
  ];
  if (reason) lines.push(`-# *${reason}*`);

  const items: ComponentsV2Item[] = [text(lines.join('\n'))];
  return { type: 'container', items, spoiler: false };
}

function cardMessage(container: ComponentsV2Container): ComponentsV2Message {
  return { type: 'components_v2', components: [container] };
}

// ── Interaction registration (exact custom IDs per suggestion) ─

function registerSuggestionHandlers(context: PluginContext, id: number): void {
  context.interactions.onButton(`sg_vote_up_${id}`, (interaction) => {
    void handleVoteButton(context, interaction, id, true);
  });
  context.interactions.onButton(`sg_vote_down_${id}`, (interaction) => {
    void handleVoteButton(context, interaction, id, false);
  });
  context.interactions.onButton(`sg_accept_${id}`, (interaction) => {
    void handleModeration(context, interaction, id, 'accepted');
  });
  context.interactions.onButton(`sg_reject_${id}`, (interaction) => {
    void handleRejectButton(context, interaction, id);
  });
  context.interactions.onButton(`sg_consider_${id}`, (interaction) => {
    void handleModeration(context, interaction, id, 'considered');
  });
  context.interactions.onModal(`sg_reject_reason_${id}`, (interaction) => {
    void handleRejectModal(context, interaction, id);
  });
}

// ── messageCreate — capture suggestions ───────────────────────

async function handleMessageCreate(context: PluginContext, payload: PluginEventPayload): Promise<void> {
  if (payload.userBot === true) return;

  const settings = await loadSettings(context);
  if (!settings.enabled || !settings.channel) return;

  const channelId = asString(payload.channelId);
  if (channelId !== settings.channel) return;

  const messageId = asString(payload.messageId);
  if (!messageId) return;

  try {
    await context.messages.delete(channelId, messageId);
  } catch { /* swallow */ }

  const content = asString(payload.content).trim();
  if (!content) return;

  const authorId = asString(payload.authorId);
  if (!authorId) return;

  const memberRoleIds = asStringArray(payload.memberRoleIds);
  const serverName = asString(payload.serverName) || 'الخادم';
  const memberTag = asString(payload.userDisplayName) || asString(payload.userName) || authorId;
  const avatarUrl = asString(payload.userAvatar);

  // ── Permission checks ────────────────────────────────────────
  const perms = settings.permissions;
  if (!perms.allowAll) {
    const hasRole = (perms.allowedRoles || []).some((roleId) => memberRoleIds.includes(roleId));
    if (!hasRole) {
      await tryDm(context, authorId, `❌ ليس لديك الدور المطلوب لإرسال اقتراحات في **${serverName}**.`);
      return;
    }
  }

  if (perms.minAccountAge > 0) {
    const ageDays = await accountAgeDays(context, authorId);
    if (ageDays < perms.minAccountAge) {
      await tryDm(
        context,
        authorId,
        `❌ يجب أن يكون عمر حسابك **${perms.minAccountAge} يوم** على الأقل لإرسال الاقتراحات هنا.`,
      );
      return;
    }
  }

  if (perms.minServerLevel > 0) {
    const level = await getUserLevel(context, authorId);
    if (level < perms.minServerLevel) {
      await tryDm(
        context,
        authorId,
        `❌ يجب أن تصل إلى **المستوى ${perms.minServerLevel}** في **${serverName}** قبل إرسال الاقتراحات.`,
      );
      return;
    }
  }

  // ── Spam checks ──────────────────────────────────────────────
  const data = await loadData(context);
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const cd = data.userCooldowns[authorId] ?? { lastSuggestion: 0, todayCount: 0, todayDate: '' };

  const spam = settings.spam;
  if (spam.cooldown > 0) {
    const minutesPassed = (now - cd.lastSuggestion) / 60_000;
    if (minutesPassed < spam.cooldown) {
      const remaining = Math.ceil(spam.cooldown - minutesPassed);
      await tryDm(
        context,
        authorId,
        `⏳ يرجى الانتظار **${remaining} دقيقة** قبل إرسال اقتراح آخر.`,
      );
      return;
    }
  }

  if (spam.maxPerDay > 0 && cd.todayDate === today && cd.todayCount >= spam.maxPerDay) {
    await tryDm(
      context,
      authorId,
      `❌ لقد وصلت إلى الحد اليومي **${spam.maxPerDay} اقتراح** في **${serverName}**.`,
    );
    return;
  }

  // ── Create suggestion record ─────────────────────────────────
  const id = data.nextId || 1;
  data.nextId = id + 1;

  const suggestion: SuggestionRecord = {
    id,
    messageId: null,
    pendingMessageId: null,
    submitterId: authorId,
    memberTag,
    avatarUrl,
    content: content.slice(0, 2000),
    status: settings.moderation.requireApproval ? 'pending' : 'active',
    upvotes: 0,
    downvotes: 0,
    voters: {},
    reactions: {},
    createdAt: now,
    threadId: null,
  };

  data.suggestions[String(id)] = suggestion;
  data.userCooldowns[authorId] = {
    lastSuggestion: now,
    todayCount: cd.todayDate === today ? cd.todayCount + 1 : 1,
    todayDate: today,
  };
  await saveData(context, data);
  registerSuggestionHandlers(context, id);

  // ── Route: pending review or post directly ───────────────────
  if (settings.moderation.requireApproval) {
    const pendingMessageId = await postPending(context, suggestion, settings);
    if (pendingMessageId) {
      suggestion.pendingMessageId = pendingMessageId;
      await saveData(context, data);
    }
    await tryDm(
      context,
      authorId,
      `✅ تم إرسال اقتراحك إلى **${serverName}** وهو بانتظار مراجعة الإدارة!`,
    );
  } else {
    const posted = await postActive(context, suggestion, settings);
    if (posted) {
      suggestion.messageId = posted.id;
      if (posted.threadId) suggestion.threadId = posted.threadId;
      await saveData(context, data);
    }
    await tryDm(context, authorId, `✅ تم نشر اقتراحك **#${id}** في **${serverName}**!`);
  }
}

// ── Posting helpers ────────────────────────────────────────────

async function postPending(
  context: PluginContext,
  suggestion: SuggestionRecord,
  settings: Settings,
): Promise<string | null> {
  const channelId = settings.moderation.pendingChannel;
  if (!channelId) return null;
  try {
    const receipt = await context.messages.sendChannel(channelId, cardMessage(buildPendingCard(suggestion)));
    return receipt.id;
  } catch {
    return null;
  }
}

async function postActive(
  context: PluginContext,
  suggestion: SuggestionRecord,
  settings: Settings,
): Promise<{ id: string; threadId: string | null } | null> {
  const channelId = settings.channel;
  if (!channelId) return null;
  try {
    const receipt = await context.messages.sendChannel(channelId, cardMessage(buildCard(suggestion, settings, true)));
    let threadId: string | null = null;
    if (settings.allowThreads) {
      try {
        const thread = await context.messages.createThread(
          channelId,
          receipt.id,
          `الاقتراح #${suggestion.id} — نقاش`,
        );
        threadId = thread?.id ?? null;
      } catch { /* swallow */ }
    }
    return { id: receipt.id, threadId };
  } catch {
    return null;
  }
}

async function refreshCard(
  context: PluginContext,
  channelId: string,
  messageId: string,
  suggestion: SuggestionRecord,
  settings: Settings,
): Promise<void> {
  try {
    await context.messages.edit(channelId, messageId, cardMessage(buildCard(suggestion, settings, true)));
  } catch { /* swallow */ }
}

async function checkAutoThreshold(
  context: PluginContext,
  channelId: string,
  messageId: string,
  suggestion: SuggestionRecord,
  settings: Settings,
  data: SuggestionData,
): Promise<void> {
  const at = settings.autoThreshold;
  if (!at.enabled || suggestion.status !== 'active') return;

  let newStatus: 'accepted' | 'rejected' | null = null;
  if (at.minUpvotes > 0 && suggestion.upvotes >= at.minUpvotes) newStatus = 'accepted';
  if (at.minDownvotes > 0 && suggestion.downvotes >= at.minDownvotes) newStatus = 'rejected';
  if (!newStatus) return;

  suggestion.status = newStatus;
  suggestion.autoModerated = true;
  await saveData(context, data);
  await refreshCard(context, channelId, messageId, suggestion, settings);
}

// ── Reaction voting ────────────────────────────────────────────

async function handleReactionAdd(context: PluginContext, payload: PluginEventPayload): Promise<void> {
  const settings = await loadSettings(context);
  if (!settings.enabled || !settings.voting?.enabled) return;
  if (settings.voting.type === 'buttons') return;

  const channelId = asString(payload.channelId);
  const messageId = asString(payload.messageId);
  const userId = asString(payload.userId);
  if (!channelId || !messageId || !userId) return;

  const user = await context.guild.fetchUser(userId).catch(() => null);
  if (!user || user.isBot) return;

  const data = await loadData(context);
  const suggestion = findByMessageId(data, messageId);
  if (!suggestion || suggestion.status !== 'active') return;

  const key = reactionKey(payload.emojiName, payload.emojiId);
  const voting = settings.voting;

  if (voting.type === 'upvote_downvote') {
    const upKey = normalizeEmoji(voting.upvoteEmoji || '👍');
    const downKey = normalizeEmoji(voting.downvoteEmoji || '👎');
    if (key !== upKey && key !== downKey) return;

    const prev = suggestion.voters[userId];
    if (key === upKey) {
      if (prev === 'up') return;
      if (prev === 'down') {
        suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
      }
      suggestion.voters[userId] = 'up';
      suggestion.upvotes++;
    } else {
      if (prev === 'down') return;
      if (prev === 'up') {
        suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
      }
      suggestion.voters[userId] = 'down';
      suggestion.downvotes++;
    }
  } else if (voting.type === 'multiple_reactions') {
    const configured = normalizeStringList(voting.multipleReactions).map(normalizeEmoji);
    if (!configured.includes(key)) return;
    suggestion.reactions[key] ??= [];
    if (!suggestion.reactions[key].includes(userId)) suggestion.reactions[key].push(userId);
  }

  await saveData(context, data);
  await refreshCard(context, channelId, messageId, suggestion, settings);
  await checkAutoThreshold(context, channelId, messageId, suggestion, settings, data);
}

async function handleReactionRemove(context: PluginContext, payload: PluginEventPayload): Promise<void> {
  const settings = await loadSettings(context);
  if (!settings.enabled || !settings.voting?.enabled) return;
  if (settings.voting.type === 'buttons') return;

  const channelId = asString(payload.channelId);
  const messageId = asString(payload.messageId);
  const userId = asString(payload.userId);
  if (!channelId || !messageId || !userId) return;

  const data = await loadData(context);
  const suggestion = findByMessageId(data, messageId);
  if (!suggestion || suggestion.status !== 'active') return;

  const key = reactionKey(payload.emojiName, payload.emojiId);
  const voting = settings.voting;

  if (voting.type === 'upvote_downvote') {
    const upKey = normalizeEmoji(voting.upvoteEmoji || '👍');
    const downKey = normalizeEmoji(voting.downvoteEmoji || '👎');
    if (key === upKey && suggestion.voters[userId] === 'up') {
      suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
      delete suggestion.voters[userId];
    } else if (key === downKey && suggestion.voters[userId] === 'down') {
      suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
      delete suggestion.voters[userId];
    } else {
      return;
    }
  } else if (voting.type === 'multiple_reactions') {
    if (!suggestion.reactions[key]) return;
    suggestion.reactions[key] = suggestion.reactions[key].filter((uid) => uid !== userId);
    if (suggestion.reactions[key].length === 0) delete suggestion.reactions[key];
  }

  await saveData(context, data);
  await refreshCard(context, channelId, messageId, suggestion, settings);
}

// ── Vote button interactions ───────────────────────────────────

async function handleVoteButton(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  id: number,
  isUp: boolean,
): Promise<void> {
  const settings = await loadSettings(context);
  if (!settings.enabled) return;

  const data = await loadData(context);
  const suggestion = data.suggestions[String(id)];
  if (!suggestion || suggestion.status !== 'active') {
    await interaction
      .respond({ kind: 'reply', message: textMessage('❌ هذا الاقتراح لم يعد نشطًا.'), ephemeral: true })
      .catch(() => {});
    return;
  }

  const userId = interaction.userId;
  const prev = suggestion.voters[userId];

  if (isUp) {
    if (prev === 'up') {
      suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
      delete suggestion.voters[userId];
      await interaction
        .respond({ kind: 'reply', message: textMessage('↩️ تم إلغاء تأييدك.'), ephemeral: true })
        .catch(() => {});
    } else {
      if (prev === 'down') suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
      suggestion.upvotes++;
      suggestion.voters[userId] = 'up';
      await interaction
        .respond({ kind: 'reply', message: textMessage('👍 تم تسجيل تأييدك!'), ephemeral: true })
        .catch(() => {});
    }
  } else {
    if (prev === 'down') {
      suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
      delete suggestion.voters[userId];
      await interaction
        .respond({ kind: 'reply', message: textMessage('↩️ تم إلغاء رفضك.'), ephemeral: true })
        .catch(() => {});
    } else {
      if (prev === 'up') suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
      suggestion.downvotes++;
      suggestion.voters[userId] = 'down';
      await interaction
        .respond({ kind: 'reply', message: textMessage('👎 تم تسجيل رفضك!'), ephemeral: true })
        .catch(() => {});
    }
  }

  await saveData(context, data);
  if (interaction.messageId) {
    await refreshCard(context, interaction.channelId, interaction.messageId, suggestion, settings);
    await checkAutoThreshold(context, interaction.channelId, interaction.messageId, suggestion, settings, data);
  }
}

// ── Moderation button interactions ─────────────────────────────

async function handleModeration(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  id: number,
  newStatus: 'accepted' | 'considered',
): Promise<void> {
  const allowed = await context.guild.hasPermission(interaction.userId, 'ManageGuild');
  if (!allowed) {
    await interaction
      .respond({
        kind: 'reply',
        message: textMessage('❌ تحتاج صلاحية **إدارة الخادم** للتعامل مع الاقتراحات.'),
        ephemeral: true,
      })
      .catch(() => {});
    return;
  }

  const settings = await loadSettings(context);
  if (!settings) return;

  const data = await loadData(context);
  const suggestion = data.suggestions[String(id)];
  if (!suggestion) {
    await interaction
      .respond({ kind: 'reply', message: textMessage('❌ الاقتراح غير موجود.'), ephemeral: true })
      .catch(() => {});
    return;
  }

  await interaction.respond({ kind: 'deferUpdate' }).catch(() => {});
  const moderatorTag = await moderatorTagFor(context, interaction.userId);
  await applyModeration(context, suggestion, newStatus, '', moderatorTag, data);
}

async function handleRejectButton(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  id: number,
): Promise<void> {
  const allowed = await context.guild.hasPermission(interaction.userId, 'ManageGuild');
  if (!allowed) {
    await interaction
      .respond({
        kind: 'reply',
        message: textMessage('❌ تحتاج صلاحية **إدارة الخادم** للتعامل مع الاقتراحات.'),
        ephemeral: true,
      })
      .catch(() => {});
    return;
  }

  const settings = await loadSettings(context);
  if (!settings) return;

  if (settings.moderation.requireRejectReason !== false) {
    await interaction
      .respond({
        kind: 'showModal',
        modal: {
          id: `sg_reject_reason_${id}`,
          title: `رفض الاقتراح #${id}`,
          fields: [
            {
              id: 'reason',
              label: 'سبب الرفض',
              style: 'paragraph',
              required: false,
              placeholder: 'اكتب سبب الرفض...',
              maxLength: 1000,
            },
          ],
        },
      })
      .catch(() => {});
    return;
  }

  const data = await loadData(context);
  const suggestion = data.suggestions[String(id)];
  if (!suggestion) {
    await interaction
      .respond({ kind: 'reply', message: textMessage('❌ الاقتراح غير موجود.'), ephemeral: true })
      .catch(() => {});
    return;
  }

  await interaction.respond({ kind: 'deferUpdate' }).catch(() => {});
  const moderatorTag = await moderatorTagFor(context, interaction.userId);
  await applyModeration(context, suggestion, 'rejected', '', moderatorTag, data);
}

async function handleRejectModal(
  context: PluginContext,
  interaction: PluginComponentInteraction,
  id: number,
): Promise<void> {
  const settings = await loadSettings(context);
  if (!settings) return;

  const data = await loadData(context);
  const suggestion = data.suggestions[String(id)];
  if (!suggestion) {
    await interaction
      .respond({ kind: 'reply', message: textMessage('❌ الاقتراح غير موجود.'), ephemeral: true })
      .catch(() => {});
    return;
  }

  const reason = (interaction.modalFields?.reason ?? '').trim();
  await interaction.respond({ kind: 'deferUpdate' }).catch(() => {});
  const moderatorTag = await moderatorTagFor(context, interaction.userId);
  await applyModeration(context, suggestion, 'rejected', reason, moderatorTag, data);
}

async function applyModeration(
  context: PluginContext,
  suggestion: SuggestionRecord,
  newStatus: SuggestionStatus,
  reason: string,
  moderatorTag: string,
  data: SuggestionData,
): Promise<void> {
  const settings = await loadSettings(context);

  suggestion.status = newStatus;
  suggestion.moderator = moderatorTag;
  suggestion.rejectReason = reason || null;
  await saveData(context, data);

  // Replace pending card with outcome card
  const pendingChannel = settings.moderation.pendingChannel;
  if (pendingChannel && suggestion.pendingMessageId) {
    try {
      await context.messages.edit(
        pendingChannel,
        suggestion.pendingMessageId,
        cardMessage(buildOutcomeCard(suggestion, moderatorTag || 'إدارة', reason)),
      );
    } catch { /* swallow */ }
  }

  // If accepted/considered → post to main suggestions channel
  if (newStatus === 'accepted' || newStatus === 'considered') {
    const posted = await postActive(context, suggestion, settings);
    if (posted) {
      suggestion.messageId = posted.id;
      if (posted.threadId) suggestion.threadId = posted.threadId;
      await saveData(context, data);
    }
  }

  // If rejected and a main card already existed → refresh it too
  if (newStatus === 'rejected' && suggestion.messageId && settings.channel) {
    try {
      await context.messages.edit(
        settings.channel,
        suggestion.messageId,
        cardMessage(buildCard(suggestion, settings, false)),
      );
    } catch { /* swallow */ }
  }

  // DM the submitter
  const serverName = await serverNameFor(context);
  await tryDm(context, suggestion.submitterId, moderationDmText(suggestion, serverName, reason));
}

async function moderatorTagFor(context: PluginContext, userId: string): Promise<string> {
  const user = await context.guild.fetchUser(userId).catch(() => null);
  if (!user) return 'غير معروف';
  return user.displayName || user.username || userId;
}

function moderationDmText(suggestion: SuggestionRecord, serverName: string, reason: string): string {
  const id = suggestion.id;
  const statusText =
    suggestion.status === 'accepted'
      ? `✅ تم **قبول** اقتراحك **#${id}** في **${serverName}**!`
      : suggestion.status === 'rejected'
        ? `❌ تم **رفض** اقتراحك **#${id}** في **${serverName}**${reason ? `\n> *${reason}*` : '.'}`
        : suggestion.status === 'considered'
          ? `🔍 اقتراحك **#${id}** في **${serverName}** أصبح **قيد الدراسة**.`
          : '';
  return statusText;
}

// ── Shared helpers ─────────────────────────────────────────────

function findByMessageId(data: SuggestionData, messageId: string): SuggestionRecord | null {
  for (const suggestion of Object.values(data.suggestions)) {
    if (suggestion.messageId === messageId || suggestion.pendingMessageId === messageId) {
      return suggestion;
    }
  }
  return null;
}

async function getUserLevel(context: PluginContext, userId: string): Promise<number> {
  try {
    const external = await context.storage.readOther<Record<string, LevelsEntry>>('levels', LEVELS_KEY);
    const entry = external?.[userId];
    if (entry) return levelFromEntry(entry);
  } catch { /* swallow */ }
  try {
    const own = await context.storage.get<Record<string, LevelsEntry>>(LEVELS_KEY);
    const entry = own?.[userId];
    if (entry) return levelFromEntry(entry);
  } catch { /* swallow */ }
  return 0;
}

function levelFromEntry(entry: LevelsEntry): number {
  const textLevel = typeof entry.textLevel === 'number' ? entry.textLevel : 0;
  const voiceLevel = typeof entry.voiceLevel === 'number' ? entry.voiceLevel : 0;
  const maxLevel = Math.max(textLevel, voiceLevel);
  if (maxLevel > 0) return maxLevel;
  const messages = typeof entry.textMessages === 'number' ? entry.textMessages : 0;
  return Math.floor(messages / 50);
}

async function accountAgeDays(context: PluginContext, userId: string): Promise<number> {
  const user = await context.guild.fetchUser(userId).catch(() => null);
  if (!user?.createdAt) return 0;
  const age = Date.now() - new Date(user.createdAt).getTime();
  return Math.max(0, Math.floor(age / 86_400_000));
}

async function serverNameFor(context: PluginContext): Promise<string> {
  const info = await context.guild.fetchGuildInfo().catch(() => null);
  return info?.name ?? 'الخادم';
}

async function tryDm(context: PluginContext, userId: string, content: string): Promise<void> {
  try {
    await context.messages.sendDirect(userId, textMessage(content));
  } catch { /* swallow */ }
}

function textMessage(content: string) {
  return { type: 'text' as const, content };
}

function normalizeEmoji(emoji: string): string {
  const match = /^<a?:([^:]+):(\d+)>$/.exec(emoji.trim());
  if (match && match[1] && match[2]) {
    return `${match[1]}:${match[2]}`;
  }
  return emoji;
}

function reactionKey(emojiName: unknown, emojiId: unknown): string {
  const name = asString(emojiName);
  const id = asString(emojiId);
  if (id) return `${name}:${id}`;
  return name;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}