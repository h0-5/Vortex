import { z } from 'zod';

import { pluginIdSchema } from './plugin.js';

export const discordSnowflakeSchema = z.string().regex(/^\d{17,20}$/);
export const commandIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/);
export const discordCommandNameSchema = z.string().regex(/^[a-z0-9_-]{1,32}$/);
export const commandTypeSchema = z.enum(['SLASH', 'PREFIX', 'BOTH']);

export const commandPermissionConfigSchema = z
  .object({
    allowedRoleIds: z.array(discordSnowflakeSchema).max(100).default([]),
    ignoredRoleIds: z.array(discordSnowflakeSchema).max(100).default([]),
    ignoredChannelIds: z.array(discordSnowflakeSchema).max(100).default([]),
    enabledChannelIds: z.array(discordSnowflakeSchema).max(100).default([]),
  })
  .strict();

export const pluginCommandSchema = z
  .object({
    commandId: commandIdSchema,
    guildId: discordSnowflakeSchema,
    pluginId: pluginIdSchema,
    defaultName: discordCommandNameSchema,
    name: discordCommandNameSchema,
    defaultDescription: z.string().min(1).max(100),
    description: z.string().min(1).max(100),
    type: commandTypeSchema,
    enabled: z.boolean(),
    aliases: z.array(discordCommandNameSchema),
    defaultPermissions: z.array(z.string().min(1).max(100)),
    permissions: commandPermissionConfigSchema,
    autoDeleteReplyOnAuthorDelete: z.boolean(),
    autoDeleteAuthorMessage: z.boolean(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const pluginCommandListResponseSchema = z.object({
  data: z.array(pluginCommandSchema),
});

export const updatePluginCommandSchema = z
  .object({
    name: discordCommandNameSchema.optional(),
    description: z.string().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
    aliases: z.array(discordCommandNameSchema).max(25).optional(),
    permissions: commandPermissionConfigSchema.optional(),
    autoDeleteReplyOnAuthorDelete: z.boolean().optional(),
    autoDeleteAuthorMessage: z.boolean().optional(),
  })
  .strict();

export const pluginEventNameSchema = z.enum([
  'guildMemberAdd',
  'guildMemberRemove',
  'guildBanAdd',
  'guildBanRemove',
  'interactionCreate',
  'messageCreate',
  'messageDelete',
  'messageUpdate',
  'guildCreate',
  'guildDelete',
  'channelCreate',
  'channelDelete',
  'roleCreate',
  'roleDelete',
  'inviteCreate',
  'inviteDelete',
  'webhooksUpdate',
  'messageReactionAdd',
  'messageReactionRemove',
]);

export const variablePreviewDataSchema = z
  .object({
    user: z.string(),
    userName: z.string(),
    userCreatedDate: z.string(),
    userCreatedDays: z.string(),
    serverName: z.string(),
    memberCount: z.string(),
    inviter: z.string(),
    inviterName: z.string(),
    invitesCount: z.string(),
    inviteCode: z.string(),
  })
  .strict();

export const discordUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .regex(/^https?:\/\//u, 'URL must start with http:// or https://');

export const textMessageSchema = z
  .object({
    type: z.literal('text'),
    content: z.string().min(1).max(2_000),
  })
  .strict();

const embedAuthorSchema = z
  .object({
    name: z.string().min(1).max(256),
    iconUrl: discordUrlSchema.optional(),
    url: discordUrlSchema.optional(),
  })
  .strict();

const embedFooterIconSourceSchema = z.enum(['none', 'user_avatar', 'server_icon', 'custom']);

const embedFooterSchema = z
  .object({
    text: z.string().min(1).max(2_048),
    iconSource: embedFooterIconSourceSchema.default('none'),
    iconUrl: discordUrlSchema.optional(),
  })
  .strict()
  .refine((footer) => footer.iconSource !== 'custom' || Boolean(footer.iconUrl), {
    message: 'Custom footer icon requires a URL.',
    path: ['iconUrl'],
  });

const embedFieldSchema = z
  .object({
    name: z.string().min(1).max(256),
    value: z.string().min(1).max(1_024),
    inline: z.boolean().default(false),
  })
  .strict();

export const embedMessageSchema = z
  .object({
    type: z.literal('embed'),
    title: z.string().max(256).optional(),
    description: z.string().max(4_096).optional(),
    color: z.number().int().min(0).max(0xffffff).optional(),
    author: embedAuthorSchema.optional(),
    footer: embedFooterSchema.optional(),
    thumbnailUrl: discordUrlSchema.optional(),
    imageUrl: discordUrlSchema.optional(),
    fields: z.array(embedFieldSchema).max(25).default([]),
  })
  .strict()
  .refine((message) => Boolean(message.title || message.description || message.fields.length), {
    message: 'An embed must include a title, description, or field.',
  });

const componentButtonSchema = z
  .object({
    type: z.literal('button'),
    id: z.string().min(1).max(100),
    label: z.string().min(1).max(80),
    style: z.enum(['primary', 'secondary', 'success', 'danger', 'link']),
    url: discordUrlSchema.optional(),
    disabled: z.boolean().default(false),
    emoji: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine((button) => button.style !== 'link' || Boolean(button.url), {
    message: 'Link buttons must have a URL.',
    path: ['url'],
  });

const componentTextDisplaySchema = z
  .object({
    type: z.literal('text_display'),
    content: z.string().min(1).max(4_000),
  })
  .strict();

const componentSeparatorSchema = z
  .object({
    type: z.literal('separator'),
    spacing: z.enum(['small', 'large']).default('small'),
    divider: z.boolean().default(true),
  })
  .strict();

const componentMediaSchema = z
  .object({
    type: z.literal('media'),
    url: discordUrlSchema,
    description: z.string().max(1_024).optional(),
    spoiler: z.boolean().default(false),
  })
  .strict();

const componentSectionSchema = z
  .object({
    type: z.literal('section'),
    content: z.string().min(1).max(4_000),
    accessory: componentButtonSchema,
  })
  .strict();

const componentSelectOptionSchema = z
  .object({
    label: z.string().min(1).max(100),
    value: z.string().min(1).max(100),
    description: z.string().min(1).max(100).optional(),
    emoji: z.string().min(1).max(100).optional(),
  })
  .strict();

const componentSelectSchema = z
  .object({
    type: z.literal('select'),
    id: z.string().min(1).max(100),
    placeholder: z.string().min(1).max(150).optional(),
    options: z.array(componentSelectOptionSchema).min(1).max(25),
    minValues: z.number().int().min(0).max(25).default(1),
    maxValues: z.number().int().min(1).max(25).default(1),
    disabled: z.boolean().default(false),
  })
  .strict();

const componentItemSchema = z.discriminatedUnion('type', [
  componentTextDisplaySchema,
  componentSeparatorSchema,
  componentMediaSchema,
  componentSectionSchema,
  componentButtonSchema,
  componentSelectSchema,
]);

const componentContainerSchema = z
  .object({
    type: z.literal('container'),
    items: z.array(componentItemSchema).min(1).max(40),
    spoiler: z.boolean().default(false),
  })
  .strict();

export const componentsV2MessageSchema = z
  .object({
    type: z.literal('components_v2'),
    components: z.array(componentContainerSchema).min(1).max(10),
  })
  .strict();

export const coreMessageSchema = z.discriminatedUnion('type', [
  textMessageSchema,
  embedMessageSchema,
  componentsV2MessageSchema,
]);

export const templateContentModeSchema = z.enum(['text', 'embed', 'components_v2', 'visual_card']);

export const visualElementBaseSchema = z
  .object({
    id: z.string().min(1).max(100),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive().max(4_096),
    height: z.number().positive().max(4_096),
    rotation: z.number().finite().min(-360).max(360).default(0),
    opacity: z.number().min(0).max(1).default(1),
  })
  .strict();

const visualTextElementSchema = visualElementBaseSchema.extend({
  type: z.literal('text'),
  text: z.string().max(2_000),
  fontFamily: z.string().min(1).max(100).default('Arial'),
  fontSize: z.number().positive().max(512).default(32),
  fill: z.string().min(1).max(64).default('#ffffff'),
});

const visualImageElementSchema = visualElementBaseSchema.extend({
  type: z.enum(['image', 'avatar', 'server_icon', 'background']),
  source: z.string().max(4_096),
  fit: z.enum(['fill', 'contain', 'cover']).default('cover'),
});

export const visualEditorElementSchema = z.union([
  visualTextElementSchema,
  visualImageElementSchema,
]);

export const visualEditorLayoutSchema = z
  .object({
    version: z.literal(1),
    width: z.number().int().min(64).max(4_096),
    height: z.number().int().min(64).max(4_096),
    backgroundColor: z.string().min(1).max(64).default('#111827'),
    elements: z.array(visualEditorElementSchema).max(200),
  })
  .strict();

export const pluginTemplateSchema = z
  .object({
    id: z.uuid(),
    guildId: discordSnowflakeSchema,
    pluginId: pluginIdSchema,
    name: z.string().min(1).max(100),
    type: z.string().min(1).max(64),
    contentMode: templateContentModeSchema,
    content: z.unknown(),
    variables: z.array(z.string().min(1).max(100)),
    previewData: z.record(z.string(), z.string()),
    version: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const pluginTemplateListResponseSchema = z.object({
  data: z.array(pluginTemplateSchema),
});

export const savePluginTemplateSchema = z
  .object({
    name: z.string().min(1).max(100),
    type: z.string().min(1).max(64),
    contentMode: templateContentModeSchema,
    content: z.unknown(),
    variables: z.array(z.string().min(1).max(100)).max(100).default([]),
    previewData: z.record(z.string(), z.string()).default({}),
  })
  .strict();

export const duplicatePluginTemplateSchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .strict();

export const pluginStorageValueSchema = z.object({ value: z.unknown() }).strict();
export type PluginStorageValue = z.infer<typeof pluginStorageValueSchema>;

export const pluginLogDestinationSchema = z.enum(['DASHBOARD', 'DISCORD', 'BOTH', 'DISABLED']);
export const pluginLogOutputTypeSchema = z.enum(['text', 'embed', 'components_v2']);

const pluginLogSettingsBaseSchema = z
  .object({
    guildId: discordSnowflakeSchema,
    pluginId: pluginIdSchema,
    destination: pluginLogDestinationSchema,
    channelId: discordSnowflakeSchema.nullable(),
    outputType: pluginLogOutputTypeSchema,
    embedColor: z.number().int().min(0).max(0xffffff).nullable(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const pluginLogSettingsSchema =
  pluginLogSettingsBaseSchema.superRefine(validatePluginLogColor);

export const updatePluginLogSettingsSchema = pluginLogSettingsBaseSchema
  .omit({ guildId: true, pluginId: true, updatedAt: true })
  .strict()
  .superRefine(validatePluginLogColor);

export const guildPluginLogListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.uuid(),
      guildId: discordSnowflakeSchema,
      pluginId: pluginIdSchema,
      level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'AUDIT']),
      message: z.string(),
      metadata: z.record(z.string(), z.unknown()),
      destination: pluginLogDestinationSchema,
      createdAt: z.iso.datetime(),
    }),
  ),
});

export const guildEmojiSchema = z
  .object({
    id: discordSnowflakeSchema,
    name: z.string().min(1).max(100),
    animated: z.boolean(),
    imageUrl: z.url(),
  })
  .strict();

export const guildEmojiListResponseSchema = z.object({
  data: z.array(guildEmojiSchema),
});

export const guildChannelSchema = z
  .object({
    id: discordSnowflakeSchema,
    name: z.string().min(1).max(100),
    type: z.number().int(),
  })
  .strict();

export const guildChannelListResponseSchema = z.object({
  data: z.array(guildChannelSchema),
});

export const guildRoleSchema = z
  .object({
    id: discordSnowflakeSchema,
    name: z.string().min(1).max(100),
    color: z.number().int(),
    position: z.number().int(),
    managed: z.boolean(),
  })
  .strict();

export const guildRoleListResponseSchema = z.object({
  data: z.array(guildRoleSchema),
});

export type CommandPermissionConfig = z.infer<typeof commandPermissionConfigSchema>;
export type CommandType = z.infer<typeof commandTypeSchema>;
export type PluginCommand = z.infer<typeof pluginCommandSchema>;
export type PluginCommandListResponse = z.infer<typeof pluginCommandListResponseSchema>;
export type UpdatePluginCommand = z.infer<typeof updatePluginCommandSchema>;
export type PluginEventName = z.infer<typeof pluginEventNameSchema>;
export type VariablePreviewData = z.infer<typeof variablePreviewDataSchema>;
export type TextMessage = z.infer<typeof textMessageSchema>;
export type EmbedMessage = z.infer<typeof embedMessageSchema>;
export type ComponentsV2Message = z.infer<typeof componentsV2MessageSchema>;
export type ComponentsV2Container = z.infer<typeof componentContainerSchema>;
export type ComponentsV2Item = z.infer<typeof componentItemSchema>;
export type ComponentsV2Button = z.infer<typeof componentButtonSchema>;
export type ComponentsV2SelectOption = z.infer<typeof componentSelectOptionSchema>;
export type ComponentsV2Select = z.infer<typeof componentSelectSchema>;
export type EmbedFooterIconSource = z.infer<typeof embedFooterIconSourceSchema>;
export type CoreMessage = z.infer<typeof coreMessageSchema>;
export type TemplateContentMode = z.infer<typeof templateContentModeSchema>;
export type VisualEditorElement = z.infer<typeof visualEditorElementSchema>;
export type VisualEditorLayout = z.infer<typeof visualEditorLayoutSchema>;
export type PluginTemplate = z.infer<typeof pluginTemplateSchema>;
export type PluginTemplateListResponse = z.infer<typeof pluginTemplateListResponseSchema>;
export type SavePluginTemplate = z.infer<typeof savePluginTemplateSchema>;
export type DuplicatePluginTemplate = z.infer<typeof duplicatePluginTemplateSchema>;
export type PluginLogDestination = z.infer<typeof pluginLogDestinationSchema>;
export type PluginLogOutputType = z.infer<typeof pluginLogOutputTypeSchema>;
export type PluginLogSettings = z.infer<typeof pluginLogSettingsSchema>;
export type UpdatePluginLogSettings = z.infer<typeof updatePluginLogSettingsSchema>;
export type GuildPluginLogListResponse = z.infer<typeof guildPluginLogListResponseSchema>;
export type GuildEmoji = z.infer<typeof guildEmojiSchema>;
export type GuildEmojiListResponse = z.infer<typeof guildEmojiListResponseSchema>;
export type GuildChannel = z.infer<typeof guildChannelSchema>;
export type GuildChannelListResponse = z.infer<typeof guildChannelListResponseSchema>;
export type GuildRole = z.infer<typeof guildRoleSchema>;
export type GuildRoleListResponse = z.infer<typeof guildRoleListResponseSchema>;

function validatePluginLogColor(
  settings: { outputType: 'text' | 'embed' | 'components_v2'; embedColor: number | null },
  context: z.RefinementCtx,
): void {
  if (settings.outputType === 'components_v2' && settings.embedColor !== null) {
    context.addIssue({
      code: 'custom',
      path: ['embedColor'],
      message: 'Components V2 log output cannot define an embed color.',
    });
  }
}
