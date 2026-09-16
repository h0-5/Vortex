import { z } from 'zod';

export const appSettingsGeneralShape = z
  .object({
    appName: z.string().min(1).max(100),
    appDescription: z.string().max(300).nullable(),
    supportUrl: z.string().url().nullable(),
    websiteUrl: z.string().url().nullable(),
    defaultLanguage: z.string().min(2).max(10),
  })
  .strict();

export const appSettingsGeneralDefaults = {
  appName: 'Vortex',
  appDescription: 'A modular Discord management platform.',
  supportUrl: null,
  websiteUrl: null,
  defaultLanguage: 'en',
};

export const appSettingsGeneralSchema = appSettingsGeneralShape.default(appSettingsGeneralDefaults);

export const appSettingsBrandingShape = z
  .object({
    logoUrl: z.union([z.string().url(), z.string().startsWith('/')]).nullable(),
    faviconUrl: z.union([z.string().url(), z.string().startsWith('/')]).nullable(),
    primaryColor: z.string().min(4).max(7),
  })
  .strict();

export const appSettingsBrandingDefaults = {
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#5865f2',
};

export const appSettingsBrandingSchema = appSettingsBrandingShape.default(appSettingsBrandingDefaults);

export const appSettingsAppearanceShape = z
  .object({
    theme: z.enum(['light', 'dark', 'system']),
    sidebarVariant: z.enum(['default', 'compact']),
  })
  .strict();

export const appSettingsAppearanceDefaults = {
  theme: 'system',
  sidebarVariant: 'default',
} as const;

export const appSettingsAppearanceSchema = appSettingsAppearanceShape.default(appSettingsAppearanceDefaults);

export const appSettingsPwaShape = z
  .object({
    enabled: z.boolean(),
    installPromptEnabled: z.boolean(),
    offlineSupportEnabled: z.boolean(),
    shortName: z.string().min(1).max(64).nullable(),
    themeColor: z.string().min(4).max(7),
    backgroundColor: z.string().min(4).max(7),
  })
  .strict();

export const appSettingsPwaDefaults = {
  enabled: false,
  installPromptEnabled: false,
  offlineSupportEnabled: false,
  shortName: null,
  themeColor: '#111827',
  backgroundColor: '#ffffff',
};

export const appSettingsPwaSchema = appSettingsPwaShape.default(appSettingsPwaDefaults);

export const appSettingsDebugShape = z
  .object({
    verboseLogging: z.boolean(),
    exposePluginApiDocs: z.boolean(),
  })
  .strict();

export const appSettingsDebugDefaults = {
  verboseLogging: false,
  exposePluginApiDocs: false,
};

export const appSettingsDebugSchema = appSettingsDebugShape.default(appSettingsDebugDefaults);

export const appSettingsSecurityShape = z
  .object({
    requireEmailVerification: z.boolean(),
    sessionDurationHours: z.number().int().min(1).max(720),
  })
  .strict();

export const appSettingsSecurityDefaults = {
  requireEmailVerification: false,
  sessionDurationHours: 168,
};

export const appSettingsSecuritySchema = appSettingsSecurityShape.default(appSettingsSecurityDefaults);

export const appSettingsIntegrationsShape = z
  .object({
    discordWebhookUrl: z.string().url().nullable(),
    providers: z.record(z.string(), z.unknown()),
  })
  .strict();

export const appSettingsIntegrationsDefaults = {
  discordWebhookUrl: null,
  providers: {},
};

export const appSettingsIntegrationsSchema = appSettingsIntegrationsShape.default(appSettingsIntegrationsDefaults);

export const appSettingsAdvancedShape = z
  .object({
    enableExperimentalFeatures: z.boolean(),
    maxGuildsPerUser: z.number().int().min(1).max(1000),
  })
  .strict();

export const appSettingsAdvancedDefaults = {
  enableExperimentalFeatures: false,
  maxGuildsPerUser: 100,
};

export const appSettingsAdvancedSchema = appSettingsAdvancedShape.default(appSettingsAdvancedDefaults);

export const appSettingsSchema = z
  .object({
    general: appSettingsGeneralSchema,
    branding: appSettingsBrandingSchema,
    appearance: appSettingsAppearanceSchema,
    pwa: appSettingsPwaSchema,
    debug: appSettingsDebugSchema,
    security: appSettingsSecuritySchema,
    integrations: appSettingsIntegrationsSchema,
    advanced: appSettingsAdvancedSchema,
  })
  .strict();

export const appSettingsSectionIdSchema = z.enum([
  'general',
  'branding',
  'appearance',
  'pwa',
  'debug',
  'security',
  'integrations',
  'advanced',
]);

export const sectionUpdateSchemaMap = {
  general: appSettingsGeneralShape.partial().strict(),
  branding: appSettingsBrandingShape.partial().strict(),
  appearance: appSettingsAppearanceShape.partial().strict(),
  pwa: appSettingsPwaShape.partial().strict(),
  debug: appSettingsDebugShape.partial().strict(),
  security: appSettingsSecurityShape.partial().strict(),
  integrations: appSettingsIntegrationsShape.partial().strict(),
  advanced: appSettingsAdvancedShape.partial().strict(),
} as const;

export const updateAppSettingsSchema = z
  .object({
    general: sectionUpdateSchemaMap.general.optional(),
    branding: sectionUpdateSchemaMap.branding.optional(),
    appearance: sectionUpdateSchemaMap.appearance.optional(),
    pwa: sectionUpdateSchemaMap.pwa.optional(),
    debug: sectionUpdateSchemaMap.debug.optional(),
    security: sectionUpdateSchemaMap.security.optional(),
    integrations: sectionUpdateSchemaMap.integrations.optional(),
    advanced: sectionUpdateSchemaMap.advanced.optional(),
  })
  .strict();

export type AppSettingsSectionId = z.infer<typeof appSettingsSectionIdSchema>;
export type AppSettingsGeneral = z.infer<typeof appSettingsGeneralSchema>;
export type AppSettingsBranding = z.infer<typeof appSettingsBrandingSchema>;
export type AppSettingsAppearance = z.infer<typeof appSettingsAppearanceSchema>;
export type AppSettingsPwa = z.infer<typeof appSettingsPwaSchema>;
export type AppSettingsDebug = z.infer<typeof appSettingsDebugSchema>;
export type AppSettingsSecurity = z.infer<typeof appSettingsSecuritySchema>;
export type AppSettingsIntegrations = z.infer<typeof appSettingsIntegrationsSchema>;
export type AppSettingsAdvanced = z.infer<typeof appSettingsAdvancedSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type UpdateAppSettings = z.infer<typeof updateAppSettingsSchema>;
export type SectionUpdate<T extends AppSettingsSectionId> = z.infer<(typeof sectionUpdateSchemaMap)[T]>;

export const settingsUploadKindSchema = z.enum(['logo', 'favicon', 'pwa_icon']);
export type SettingsUploadKind = z.infer<typeof settingsUploadKindSchema>;

export const activityEventSchema = z
  .object({
    id: z.uuid(),
    actorId: z.uuid(),
    actorName: z.string().min(1),
    guildId: z.string().regex(/^\d{17,20}$/).nullable(),
    pluginId: z.string().min(1).max(64).nullable(),
    action: z.string().min(1).max(64),
    resourceType: z.string().min(1).max(64),
    resourceId: z.string().min(1).max(128).nullable(),
    type: z.string().min(1).max(64),
    message: z.string().min(1),
    oldValue: z.unknown().nullable(),
    newValue: z.unknown().nullable(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const activityEventListResponseSchema = z.object({
  data: z.array(activityEventSchema),
  meta: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  action: z.string().max(64).optional(),
  resourceType: z.string().max(64).optional(),
  guildId: z.string().max(20).optional(),
  pluginId: z.string().max(64).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;
export type ActivityEventListResponse = z.infer<typeof activityEventListResponseSchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
