import {
  boolean,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const guildPermissionRole = pgEnum('guild_permission_role', [
  'OWNER',
  'ADMINISTRATOR',
  'MANAGER',
]);
export const pluginStatus = pgEnum('plugin_status', ['INSTALLED', 'ERROR', 'BROKEN']);
export const pluginLogLevel = pgEnum('plugin_log_level', [
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
  'AUDIT',
]);
export const pluginLogDestination = pgEnum('plugin_log_destination', [
  'DASHBOARD',
  'DISCORD',
  'BOTH',
  'DISABLED',
]);
export const pluginLogOutputType = pgEnum('plugin_log_output_type', [
  'text',
  'embed',
  'components_v2',
]);
export const pluginCommandType = pgEnum('plugin_command_type', ['SLASH', 'PREFIX', 'BOTH']);
export const templateContentMode = pgEnum('template_content_mode', [
  'text',
  'embed',
  'components_v2',
  'visual_card',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    discordId: varchar('discord_id', { length: 20 }).notNull(),
    username: varchar('username', { length: 32 }).notNull(),
    avatar: varchar('avatar', { length: 128 }),
    globalName: varchar('global_name', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_discord_id_unique').on(table.discordId)],
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 32 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 128 }).notNull(),
    accessTokenCiphertext: text('access_token_ciphertext').notNull(),
    accessTokenIv: varchar('access_token_iv', { length: 32 }).notNull(),
    accessTokenAuthTag: varchar('access_token_auth_tag', { length: 32 }).notNull(),
    refreshTokenCiphertext: text('refresh_token_ciphertext').notNull(),
    refreshTokenIv: varchar('refresh_token_iv', { length: 32 }).notNull(),
    refreshTokenAuthTag: varchar('refresh_token_auth_tag', { length: 32 }).notNull(),
    scopes: text('scopes').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('oauth_accounts_provider_account_unique').on(
      table.provider,
      table.providerAccountId,
    ),
    uniqueIndex('oauth_accounts_user_provider_unique').on(table.userId, table.provider),
  ],
);

export const guilds = pgTable(
  'guilds',
  {
    id: varchar('id', { length: 20 }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    icon: varchar('icon', { length: 128 }),
    ownerId: varchar('owner_id', { length: 20 }).notNull(),
    botPresent: boolean('bot_present').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('guilds_owner_id_index').on(table.ownerId)],
);

export const guildMembers = pgTable(
  'guild_members',
  {
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: guildPermissionRole('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.guildId, table.userId] }),
    index('guild_members_user_id_index').on(table.userId),
  ],
);

export const plugins = pgTable('plugins', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  version: varchar('version', { length: 64 }).notNull(),
  description: text('description').notNull(),
  author: varchar('author', { length: 100 }).notNull(),
  status: pluginStatus('status').default('INSTALLED').notNull(),
  brokenReason: varchar('broken_reason', { length: 255 }),
  installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const guildPlugins = pgTable(
  'guild_plugins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').default(false).notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
    installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('guild_plugins_guild_plugin_unique').on(table.guildId, table.pluginId),
    index('guild_plugins_guild_id_index').on(table.guildId),
  ],
);

export const pluginLogs = pgTable(
  'plugin_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    level: pluginLogLevel('level').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    destination: pluginLogDestination('destination').default('DASHBOARD').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('plugin_logs_guild_plugin_created_index').on(
      table.guildId,
      table.pluginId,
      table.createdAt,
    ),
  ],
);

export const pluginLogSettings = pgTable(
  'plugin_log_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    destination: pluginLogDestination('destination').default('DASHBOARD').notNull(),
    channelId: varchar('channel_id', { length: 20 }),
    outputType: pluginLogOutputType('output_type').default('text').notNull(),
    embedColor: integer('embed_color'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('plugin_log_settings_guild_plugin_unique').on(table.guildId, table.pluginId),
  ],
);

export const pluginCommands = pgTable(
  'plugin_commands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    commandId: varchar('command_id', { length: 64 }).notNull(),
    defaultName: varchar('default_name', { length: 32 }).notNull(),
    defaultDescription: varchar('default_description', { length: 100 }).notNull(),
    type: pluginCommandType('type').notNull(),
    defaultPermissions: jsonb('default_permissions').$type<string[]>().default([]).notNull(),
    options: jsonb('options')
      .$type<
        Array<{
          name: string;
          description: string;
          type: 'STRING' | 'BOOLEAN' | 'INTEGER' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE';
          required?: boolean;
        }>
      >()
      .default([])
      .notNull(),
    autoDeleteReplyOnAuthorDelete: boolean('auto_delete_reply_on_author_delete')
      .default(false)
      .notNull(),
    autoDeleteAuthorMessage: boolean('auto_delete_author_message').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('plugin_commands_scope_command_unique').on(
      table.guildId,
      table.pluginId,
      table.commandId,
    ),
    index('plugin_commands_scope_index').on(table.guildId, table.pluginId),
  ],
);

export const guildPluginCommands = pgTable(
  'guild_plugin_commands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    commandId: varchar('command_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 32 }).notNull(),
    description: varchar('description', { length: 100 }).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    autoDeleteReplyOnAuthorDelete: boolean('auto_delete_reply_on_author_delete')
      .default(false)
      .notNull(),
    autoDeleteAuthorMessage: boolean('auto_delete_author_message').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('guild_plugin_commands_scope_command_unique').on(
      table.guildId,
      table.pluginId,
      table.commandId,
    ),
    uniqueIndex('guild_plugin_commands_guild_name_unique').on(table.guildId, table.name),
  ],
);

export const commandAliases = pgTable(
  'command_aliases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    commandId: varchar('command_id', { length: 64 }).notNull(),
    alias: varchar('alias', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('command_aliases_guild_alias_unique').on(table.guildId, table.alias),
    index('command_aliases_scope_command_index').on(table.guildId, table.pluginId, table.commandId),
  ],
);

export const commandPermissions = pgTable(
  'command_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    commandId: varchar('command_id', { length: 64 }).notNull(),
    allowedRoleIds: jsonb('allowed_role_ids').$type<string[]>().default([]).notNull(),
    ignoredRoleIds: jsonb('ignored_role_ids').$type<string[]>().default([]).notNull(),
    ignoredChannelIds: jsonb('ignored_channel_ids').$type<string[]>().default([]).notNull(),
    enabledChannelIds: jsonb('enabled_channel_ids').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('command_permissions_scope_command_unique').on(
      table.guildId,
      table.pluginId,
      table.commandId,
    ),
  ],
);

export const commandLogs = pgTable(
  'command_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    commandId: varchar('command_id', { length: 64 }).notNull(),
    userId: varchar('user_id', { length: 20 }).notNull(),
    channelId: varchar('channel_id', { length: 20 }).notNull(),
    status: varchar('status', { length: 32 }).notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('command_logs_scope_created_index').on(table.guildId, table.pluginId, table.createdAt),
  ],
);

export const pluginTemplates = pgTable(
  'plugin_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    contentMode: templateContentMode('content_mode').notNull(),
    content: jsonb('content').$type<unknown>().notNull(),
    variables: jsonb('variables').$type<string[]>().default([]).notNull(),
    previewData: jsonb('preview_data').$type<Record<string, string>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('plugin_templates_scope_name_unique').on(table.guildId, table.pluginId, table.name),
  ],
);

export const guildPluginTemplates = pgTable(
  'guild_plugin_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => pluginTemplates.id, { onDelete: 'cascade' }),
    content: jsonb('content').$type<unknown>().notNull(),
    previewData: jsonb('preview_data').$type<Record<string, string>>().default({}).notNull(),
    currentVersion: integer('current_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('guild_plugin_templates_scope_template_unique').on(
      table.guildId,
      table.pluginId,
      table.templateId,
    ),
  ],
);

export const templateVersions = pgTable(
  'template_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .notNull()
      .references(() => pluginTemplates.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('template_versions_scope_version_unique').on(
      table.guildId,
      table.pluginId,
      table.templateId,
      table.version,
    ),
  ],
);

export const pluginStorage = pgTable(
  'plugin_storage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: varchar('guild_id', { length: 20 })
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('plugin_storage_scope_key_unique').on(table.guildId, table.pluginId, table.key),
    index('plugin_storage_scope_index').on(table.guildId, table.pluginId),
  ],
);

export const pluginMigrations = pgTable(
  'plugin_migrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pluginId: varchar('plugin_id', { length: 64 })
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    migrationName: varchar('migration_name', { length: 255 }).notNull(),
    checksum: varchar('checksum', { length: 128 }).notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('plugin_migrations_plugin_name_unique').on(table.pluginId, table.migrationName),
  ],
);

export const appSettings = pgTable(
  'app_settings',
  {
    id: integer('id').primaryKey().default(1),
    value: jsonb('value').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('app_settings_id_index').on(table.id)],
);

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorName: varchar('actor_name', { length: 64 }).notNull(),
    guildId: varchar('guild_id', { length: 20 }).references(() => guilds.id, { onDelete: 'cascade' }),
    pluginId: varchar('plugin_id', { length: 64 }),
    action: varchar('action', { length: 64 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceId: varchar('resource_id', { length: 128 }),
    type: varchar('type', { length: 64 }).notNull(),
    message: text('message').notNull(),
    oldValue: jsonb('old_value').$type<unknown>(),
    newValue: jsonb('new_value').$type<unknown>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('activity_events_actor_created_index').on(table.actorId, table.createdAt),
    index('activity_events_action_index').on(table.action),
    index('activity_events_resource_type_index').on(table.resourceType),
    index('activity_events_guild_id_index').on(table.guildId),
    index('activity_events_plugin_id_index').on(table.pluginId),
    index('activity_events_created_at_index').on(table.createdAt),
  ],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6, withTimezone: false }).notNull(),
  },
  (table) => [index('user_sessions_expire_index').on(table.expire)],
);

export type UserRecord = typeof users.$inferSelect;
export type GuildRecord = typeof guilds.$inferSelect;
export type GuildMemberRecord = typeof guildMembers.$inferSelect;
export type PluginRecord = typeof plugins.$inferSelect;
export type GuildPluginRecord = typeof guildPlugins.$inferSelect;
export type PluginLogRecord = typeof pluginLogs.$inferSelect;
export type PluginLogSettingsRecord = typeof pluginLogSettings.$inferSelect;
export type PluginCommandRecord = typeof pluginCommands.$inferSelect;
export type GuildPluginCommandRecord = typeof guildPluginCommands.$inferSelect;
export type PluginTemplateRecord = typeof pluginTemplates.$inferSelect;
export type PluginStorageRecord = typeof pluginStorage.$inferSelect;
export type PluginMigrationRecord = typeof pluginMigrations.$inferSelect;
export type AppSettingsRecord = typeof appSettings.$inferSelect;
export type ActivityEventRecord = typeof activityEvents.$inferSelect;
