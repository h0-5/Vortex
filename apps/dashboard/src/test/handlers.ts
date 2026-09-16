import { http, HttpResponse } from 'msw';

import type {
  ActivityEventListResponse,
  AppSettings,
  BotProfile,
  GuildListResponse,
  GuildPluginListResponse,
  User,
} from '@vortex/types';

const baseSettings: AppSettings = {
  general: {
    appName: 'Vortex',
    appDescription: 'A modular Discord management platform.',
    supportUrl: null,
    websiteUrl: null,
    defaultLanguage: 'en',
  },
  branding: { logoUrl: null, faviconUrl: null, primaryColor: '#5865f2' },
  appearance: { theme: 'system', sidebarVariant: 'default' },
  pwa: {
    enabled: false,
    installPromptEnabled: false,
    offlineSupportEnabled: false,
    shortName: null,
    themeColor: '#111827',
    backgroundColor: '#ffffff',
  },
  debug: { verboseLogging: false, exposePluginApiDocs: false },
  security: { requireEmailVerification: false, sessionDurationHours: 168 },
  integrations: { discordWebhookUrl: null, providers: {} },
  advanced: { enableExperimentalFeatures: false, maxGuildsPerUser: 100 },
};

const baseUser: User = {
  id: '11111111-1111-4111-9111-111111111111',
  discordId: '123456789012345678',
  username: 'testuser',
  globalName: 'Test User',
  avatar: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const baseBotProfile: BotProfile = {
  id: '123456789012345678',
  username: 'VortexBot',
  avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png',
  discriminator: null,
};

export const handlers = [
  http.get('/api/v1/me', () => HttpResponse.json(baseUser)),
  http.get('/api/v1/bot/profile', () => HttpResponse.json(baseBotProfile)),
  http.get('/api/v1/settings', () => HttpResponse.json(baseSettings)),
  http.patch('/api/v1/settings/general', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...baseSettings,
      general: { ...baseSettings.general, ...body },
    });
  }),
  http.patch('/api/v1/settings/branding', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...baseSettings,
      branding: { ...baseSettings.branding, ...body },
    });
  }),
  http.post('/api/v1/settings/branding/logo', () =>
    HttpResponse.json({
      ...baseSettings,
      branding: { ...baseSettings.branding, logoUrl: 'https://example.com/logo.png' },
    }),
  ),
  http.get('/api/v1/activity', () => {
    const response: ActivityEventListResponse = {
      data: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          actorId: baseUser.id,
          actorName: baseUser.globalName ?? baseUser.username,
          guildId: null,
          pluginId: null,
          action: 'settings.updated',
          resourceType: 'settings',
          resourceId: 'general',
          type: 'settings.general.updated',
          message: 'App name changed from "Vortex" to "Code Nexus"',
          oldValue: 'Vortex',
          newValue: 'Code Nexus',
          metadata: { section: 'general', field: 'appName' },
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    return HttpResponse.json(response);
  }),
  http.get('/api/v1/guilds', () => {
    const response: GuildListResponse = {
      data: [
        {
          id: '1111111111111111111',
          name: 'Test Server',
          icon: null,
          memberCount: 100,
          canManage: true,
          isOwner: true,
          hasAdmin: false,
          hasManager: false,
          botConnected: true,
          action: 'manage',
          permissionRole: 'OWNER',
        },
      ],
    };
    return HttpResponse.json(response);
  }),
  http.get('/api/v1/guilds/:guildId/plugins', () => {
    const response: GuildPluginListResponse = {
      data: [
        {
          id: 'welcome',
          name: 'Welcome',
          version: '1.0.0',
          description: 'Welcome plugin',
          author: 'h05',
          status: 'INSTALLED',
          brokenReason: null,
          enabled: true,
          guildStatus: 'ENABLED',
          installedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dashboard: {
            enabled: true,
            route: 'welcome',
            label: 'Welcome',
            icon: 'Sparkles',
            tabs: ['overview', 'welcome', 'leave', 'dm', 'templates', 'commands', 'logs'],
          },
        },
      ],
    };
    return HttpResponse.json(response);
  }),
];
