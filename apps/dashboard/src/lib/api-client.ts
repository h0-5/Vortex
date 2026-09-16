import {
  activityEventListResponseSchema,
  appSettingsSchema,
  botProfileSchema,
  guildDetailSchema,
  guildListResponseSchema,
  guildPluginListResponseSchema,
  guildPluginSchema,
  guildPluginDetailSchema,
  guildEmojiListResponseSchema,
  guildChannelListResponseSchema,
  guildRoleListResponseSchema,
  guildPluginLogListResponseSchema,
  pluginLogListResponseSchema,
  pluginLogSettingsSchema,
  pluginStorageValueSchema,
  pluginCommandListResponseSchema,
  pluginCommandSchema,
  pluginTemplateListResponseSchema,
  pluginTemplateSchema,
  pluginTestResultSchema,
  problemDetailSchema,
  testTemplateSchema,
  userSchema,
  type ActivityEventListResponse,
  type ActivityQuery,
  type AppSettings,
  type AppSettingsSectionId,
  type BotProfile,
  type GuildDetail,
  type GuildListResponse,
  type GuildPlugin,
  type GuildPluginDetail,
  type GuildPluginListResponse,
  type GuildEmojiListResponse,
  type GuildChannelListResponse,
  type GuildRoleListResponse,
  type GuildPluginLogListResponse,
  type PluginLogListResponse,
  type PluginLogSettings,
  type PluginCommand,
  type PluginCommandListResponse,
  type PluginStorageValue,
  type PluginTemplate,
  type PluginTemplateListResponse,
  type PluginTestResult,
  type ProblemDetail,
  type SavePluginTemplate,
  type TestTemplate,
  type UpdateAppSettings,
  type UpdatePluginCommand,
  type UpdatePluginLogSettings,
  type User,
} from '@vortex/types';
import type { ZodType } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetail,
  ) {
    super(problem.error?.message ?? problem.detail);
  }

  get code(): string | undefined {
    return this.problem.error?.code;
  }
}

export const api = {
  getCurrentUser: () => request('/api/v1/me', userSchema),
  getBotProfile: () => request('/api/v1/bot/profile', botProfileSchema),
  getSettings: () => request('/api/v1/settings', appSettingsSchema),
  updateSettings: (update: UpdateAppSettings) =>
    request('/api/v1/settings', appSettingsSchema, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }),
  updateSettingsSection: (section: AppSettingsSectionId, patch: Record<string, unknown>) =>
    request(`/api/v1/settings/${encodeURIComponent(section)}`, appSettingsSchema, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  uploadBrandingAsset: (kind: 'logo' | 'favicon' | 'pwa_icon', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/v1/settings/branding/${encodeURIComponent(kind)}`, appSettingsSchema, {
      method: 'POST',
      body: formData,
    });
  },
  getActivity: (query: ActivityQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
    return request(`/api/v1/activity?${params.toString()}`, activityEventListResponseSchema);
  },
  getGuilds: () => request('/api/v1/guilds', guildListResponseSchema),
  getGuild: (guildId: string) =>
    request(`/api/v1/guilds/${encodeURIComponent(guildId)}`, guildDetailSchema),
  getGuildPlugins: (guildId: string) =>
    request(`/api/v1/guilds/${encodeURIComponent(guildId)}/plugins`, guildPluginListResponseSchema),
  getGuildPlugin: (guildId: string, pluginId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}`,
      guildPluginDetailSchema,
    ),
  uploadGuildPlugin: (guildId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/upload`,
      guildPluginSchema,
      {
        method: 'POST',
        body: formData,
      },
    );
  },
  enableGuildPlugin: (guildId: string, pluginId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/enable`,
      guildPluginSchema,
      { method: 'POST' },
    ),
  disableGuildPlugin: (guildId: string, pluginId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/disable`,
      guildPluginSchema,
      { method: 'POST' },
    ),
  deleteGuildPlugin: (guildId: string, pluginId: string, deleteData: boolean) =>
    requestWithoutContent(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteData }),
      },
    ),
  getGuildPluginLogs: (guildId: string, pluginId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/logs`,
      pluginLogListResponseSchema,
    ),
  getGuildPluginCommands: (guildId: string, pluginId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/commands`,
      pluginCommandListResponseSchema,
    ),
  updateGuildPluginCommand: (
    guildId: string,
    pluginId: string,
    commandId: string,
    update: UpdatePluginCommand,
  ) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/commands/${encodeURIComponent(commandId)}`,
      pluginCommandSchema,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      },
    ),
  getGuildPluginActivity: (guildId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/logs`,
      guildPluginLogListResponseSchema,
    ),
  getGuildEmojis: (guildId: string) =>
    request(`/api/v1/guilds/${encodeURIComponent(guildId)}/emojis`, guildEmojiListResponseSchema),
  getGuildChannels: (guildId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/channels`,
      guildChannelListResponseSchema,
    ),
  getGuildCategories: (guildId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/categories`,
      guildChannelListResponseSchema,
    ),
  getGuildRoles: (guildId: string) =>
    request(`/api/v1/guilds/${encodeURIComponent(guildId)}/roles`, guildRoleListResponseSchema),
  getGuildPluginLogSettings: (guildId: string, pluginId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/log-settings`,
      pluginLogSettingsSchema,
    ),
  updateGuildPluginLogSettings: (
    guildId: string,
    pluginId: string,
    update: UpdatePluginLogSettings,
  ) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/log-settings`,
      pluginLogSettingsSchema,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      },
    ),
  getGuildPluginStorage: (guildId: string, pluginId: string, key: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/storage/${encodeURIComponent(key)}`,
      pluginStorageValueSchema,
    ),
  setGuildPluginStorage: (guildId: string, pluginId: string, key: string, value: unknown) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/storage/${encodeURIComponent(key)}`,
      pluginStorageValueSchema,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      },
    ),
  getGuildPluginTemplates: (guildId: string, pluginId: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/templates`,
      pluginTemplateListResponseSchema,
    ),
  saveGuildPluginTemplate: (guildId: string, pluginId: string, template: SavePluginTemplate) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/templates`,
      pluginTemplateSchema,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      },
    ),
  duplicateGuildPluginTemplate: (guildId: string, pluginId: string, name: string, nextName: string) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/templates/${encodeURIComponent(name)}/duplicate`,
      pluginTemplateSchema,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      },
    ),
  deleteGuildPluginTemplate: (guildId: string, pluginId: string, name: string) =>
    requestWithoutContent(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/templates/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    ),
  testGuildPluginTemplate: (guildId: string, pluginId: string, name: string, body: Omit<TestTemplate, 'templateName'>) =>
    request(
      `/api/v1/guilds/${encodeURIComponent(guildId)}/plugins/${encodeURIComponent(pluginId)}/templates/${encodeURIComponent(name)}/test`,
      pluginTestResultSchema,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testTemplateSchema.parse({ templateName: name, ...body })),
      },
    ),
  logout: () => requestWithoutContent('/api/v1/auth/logout', { method: 'POST' }),
} satisfies {
  getCurrentUser: () => Promise<User>;
  getBotProfile: () => Promise<BotProfile>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (update: UpdateAppSettings) => Promise<AppSettings>;
  updateSettingsSection: (section: AppSettingsSectionId, patch: Record<string, unknown>) => Promise<AppSettings>;
  uploadBrandingAsset: (kind: 'logo' | 'favicon' | 'pwa_icon', file: File) => Promise<AppSettings>;
  getActivity: (query: ActivityQuery) => Promise<ActivityEventListResponse>;
  getGuilds: () => Promise<GuildListResponse>;
  getGuild: (guildId: string) => Promise<GuildDetail>;
  getGuildPlugins: (guildId: string) => Promise<GuildPluginListResponse>;
  getGuildPlugin: (guildId: string, pluginId: string) => Promise<GuildPluginDetail>;
  uploadGuildPlugin: (guildId: string, file: File) => Promise<GuildPlugin>;
  enableGuildPlugin: (guildId: string, pluginId: string) => Promise<GuildPlugin>;
  disableGuildPlugin: (guildId: string, pluginId: string) => Promise<GuildPlugin>;
  deleteGuildPlugin: (guildId: string, pluginId: string, deleteData: boolean) => Promise<void>;
  getGuildPluginLogs: (guildId: string, pluginId: string) => Promise<PluginLogListResponse>;
  getGuildPluginCommands: (guildId: string, pluginId: string) => Promise<PluginCommandListResponse>;
  updateGuildPluginCommand: (
    guildId: string,
    pluginId: string,
    commandId: string,
    update: UpdatePluginCommand,
  ) => Promise<PluginCommand>;
  getGuildPluginActivity: (guildId: string) => Promise<GuildPluginLogListResponse>;
  getGuildEmojis: (guildId: string) => Promise<GuildEmojiListResponse>;
  getGuildChannels: (guildId: string) => Promise<GuildChannelListResponse>;
  getGuildCategories: (guildId: string) => Promise<GuildChannelListResponse>;
  getGuildRoles: (guildId: string) => Promise<GuildRoleListResponse>;
  getGuildPluginLogSettings: (guildId: string, pluginId: string) => Promise<PluginLogSettings>;
  updateGuildPluginLogSettings: (
    guildId: string,
    pluginId: string,
    update: UpdatePluginLogSettings,
  ) => Promise<PluginLogSettings>;
  getGuildPluginStorage: (guildId: string, pluginId: string, key: string) => Promise<PluginStorageValue>;
  setGuildPluginStorage: (
    guildId: string,
    pluginId: string,
    key: string,
    value: unknown,
  ) => Promise<PluginStorageValue>;
  getGuildPluginTemplates: (guildId: string, pluginId: string) => Promise<PluginTemplateListResponse>;
  saveGuildPluginTemplate: (
    guildId: string,
    pluginId: string,
    template: SavePluginTemplate,
  ) => Promise<PluginTemplate>;
  duplicateGuildPluginTemplate: (
    guildId: string,
    pluginId: string,
    name: string,
    nextName: string,
  ) => Promise<PluginTemplate>;
  deleteGuildPluginTemplate: (guildId: string, pluginId: string, name: string) => Promise<void>;
  testGuildPluginTemplate: (
    guildId: string,
    pluginId: string,
    name: string,
    body: TestTemplate,
  ) => Promise<PluginTestResult>;
  logout: () => Promise<void>;
};

function assertValidGuildPath(path: string): void {
  if (path.includes('/guilds//')) {
    throw new Error('Invalid request path: missing guild ID.');
  }
}

async function request<T>(path: string, schema: ZodType<T>, init: RequestInit = {}): Promise<T> {
  assertValidGuildPath(path);
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init.headers },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }
  return schema.parse(await response.json());
}

async function requestWithoutContent(path: string, init: RequestInit): Promise<void> {
  assertValidGuildPath(path);
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init.headers },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }
}

async function createApiError(response: Response): Promise<ApiError> {
  const fallback: ProblemDetail = {
    type: 'about:blank',
    title: 'Request Error',
    status: response.status,
    detail: 'The request could not be completed.',
    instance: response.url,
    requestId: response.headers.get('x-request-id') ?? 'unknown',
  };

  try {
    return new ApiError(response.status, problemDetailSchema.parse(await response.json()));
  } catch {
    return new ApiError(response.status, fallback);
  }
}
