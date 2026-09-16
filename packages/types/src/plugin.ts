import { z } from 'zod';

export const semanticVersionSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
export const pluginIdSchema = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/);
export const pluginPermissionSchema = z.string().regex(/^[a-z][a-z0-9._:-]{1,127}$/);

export const pluginCapabilitiesSchema = z
  .object({
    commands: z.boolean(),
    events: z.boolean(),
    dashboard: z.boolean(),
    database: z.boolean(),
    templates: z.boolean().default(false),
    visualEditor: z.boolean().default(false),
    logs: z.boolean().default(false),
  })
  .strict();

const pluginDashboardShape = z
  .object({
    enabled: z.boolean(),
    route: z.string().min(1).max(255),
    label: z.string().min(1).max(100),
    icon: z.string().min(1).max(100),
    tabs: z.array(z.string().regex(/^[a-z][a-z0-9-]{0,63}$/)).max(20).default([]),
  })
  .strict();

export const pluginDashboardFieldSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9._-]{0,127}$/),
    type: z.enum(['switch', 'channel_select', 'category_select', 'role_select', 'select', 'text', 'number', 'message_composer', 'template_select']),
    label: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    storageKey: z.string().min(1).max(255),
    path: z.string().min(1).max(255),
    defaultValue: z.unknown().optional(),
    options: z.array(z.object({ label: z.string().min(1).max(100), value: z.string().min(1).max(100) }).strict()).max(50).optional(),
    contentModes: z.array(z.enum(['text', 'embed', 'components_v2'])).min(1).max(3).optional(),
    templateType: z.string().min(1).max(64).optional(),
    placeholder: z.string().max(500).optional(),
    multiline: z.boolean().optional(),
  })
  .strict();

export const pluginDashboardActionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9._-]{0,127}$/),
    type: z.enum(['save_storage', 'save_template', 'test_template', 'reset']),
    label: z.string().min(1).max(120),
    storageKeys: z.array(z.string().min(1).max(255)).max(20).optional(),
    templateNamePath: z.string().min(1).max(255).optional(),
    templateContentPath: z.string().min(1).max(255).optional(),
    templateType: z.string().min(1).max(64).optional(),
    templateContentModePath: z.string().min(1).max(255).optional(),
    channelIdPath: z.string().min(1).max(255).optional(),
  })
  .strict();

export const pluginDashboardSectionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9._-]{0,127}$/),
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    fields: z.array(pluginDashboardFieldSchema).max(50).default([]),
    actions: z.array(pluginDashboardActionSchema).max(20).default([]),
  })
  .strict();

export const pluginDashboardTabSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
    label: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    sections: z.array(pluginDashboardSectionSchema).max(20).default([]),
  })
  .strict();

export const pluginDashboardSchemaDocumentSchema = z
  .object({
    version: z.literal(1),
    contentMode: z.literal('schema'),
    tabs: z.array(pluginDashboardTabSchema).min(1).max(20),
    defaults: z.record(z.string(), z.unknown()).default({}),
    previewVariables: z.record(z.string(), z.string()).default({}),
    defaultMessages: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const pluginDashboardSchema = pluginDashboardShape.optional();

export const packageMetadataSchema = z
  .object({
    packageVersion: z.string().optional(),
    builtAt: z.string().optional(),
    sourceCommit: z.string().optional(),
    coreCompatibility: z.string().optional(),
    manifestHash: z.string().optional(),
    fileCount: z.number().optional(),
    checksums: z.record(z.string(), z.string()).optional(),
  })
  .optional();

export const pluginManifestSchema = z
  .object({
    id: pluginIdSchema,
    name: z.string().min(1).max(100),
    version: semanticVersionSchema,
    description: z.string().min(1).max(500),
    author: z.string().min(1).max(100),
    minCoreVersion: semanticVersionSchema,
    entry: z.string().min(1).max(255),
    permissions: z.array(pluginPermissionSchema).max(100),
    capabilities: pluginCapabilitiesSchema,
    dashboard: pluginDashboardSchema,
    packageMetadata: packageMetadataSchema,
  })
  .strict()
  .superRefine((manifest, context) => {
    if (new Set(manifest.permissions).size !== manifest.permissions.length) {
      context.addIssue({
        code: 'custom',
        path: ['permissions'],
        message: 'Plugin permissions must be unique.',
      });
    }
  });

export const pluginStatusSchema = z.enum(['INSTALLED', 'ERROR', 'BROKEN']);
export const guildPluginStatusSchema = z.enum(['ENABLED', 'DISABLED']);
export const pluginLogLevelSchema = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'AUDIT']);

export const guildPluginSchema = z.object({
  id: pluginIdSchema,
  name: z.string(),
  version: semanticVersionSchema,
  description: z.string(),
  author: z.string(),
  status: pluginStatusSchema,
  brokenReason: z.string().max(255).nullable(),
  enabled: z.boolean(),
  guildStatus: guildPluginStatusSchema,
  installedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
  dashboard: pluginDashboardShape.nullable(),
});

export const guildPluginDetailSchema = guildPluginSchema.extend({
  dashboardContent: z
    .object({
      mode: z.enum(['schema', 'bundle', 'none']),
      schema: pluginDashboardSchemaDocumentSchema.nullable(),
      bundleUrl: z.string().nullable(),
      assetsBaseUrl: z.string().nullable(),
      errors: z.array(z.string()).default([]),
    })
    .strict(),
});

export const guildPluginListResponseSchema = z.object({
  data: z.array(guildPluginSchema),
});

export const pluginLogSchema = z.object({
  id: z.uuid(),
  guildId: z.string().regex(/^\d{17,20}$/),
  pluginId: pluginIdSchema,
  level: pluginLogLevelSchema,
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  destination: z.enum(['DASHBOARD', 'DISCORD', 'BOTH', 'DISABLED']),
  createdAt: z.iso.datetime(),
});

export const pluginLogListResponseSchema = z.object({
  data: z.array(pluginLogSchema),
});

export const deletePluginSchema = z.object({
  deleteData: z.boolean().default(false),
});

export type PluginCapabilities = z.infer<typeof pluginCapabilitiesSchema>;
export type PluginDashboard = z.infer<typeof pluginDashboardShape>;
export type PluginDashboardField = z.infer<typeof pluginDashboardFieldSchema>;
export type PluginDashboardAction = z.infer<typeof pluginDashboardActionSchema>;
export type PluginDashboardSection = z.infer<typeof pluginDashboardSectionSchema>;
export type PluginDashboardTab = z.infer<typeof pluginDashboardTabSchema>;
export type PluginDashboardSchemaDocument = z.infer<typeof pluginDashboardSchemaDocumentSchema>;
export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginStatus = z.infer<typeof pluginStatusSchema>;
export type GuildPluginStatus = z.infer<typeof guildPluginStatusSchema>;
export type PluginLogLevel = z.infer<typeof pluginLogLevelSchema>;
export type GuildPlugin = z.infer<typeof guildPluginSchema>;
export type GuildPluginDetail = z.infer<typeof guildPluginDetailSchema>;
export type GuildPluginListResponse = z.infer<typeof guildPluginListResponseSchema>;
export type PluginLog = z.infer<typeof pluginLogSchema>;
export type PluginLogListResponse = z.infer<typeof pluginLogListResponseSchema>;
export type DeletePluginRequest = z.infer<typeof deletePluginSchema>;
