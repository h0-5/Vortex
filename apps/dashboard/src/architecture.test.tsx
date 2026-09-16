import type { GuildListResponse } from '@vortex/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DashboardStats } from './components/dashboard-stats.js';
import { DiscordMessagePreview } from './components/discord-message-preview.js';
import { createDefaultMessage, MessageComposer } from './components/message-composer.js';
import { RecentActivity } from './components/recent-activity.js';

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const mockWelcomeSchemaPath = '../../../tests/fixtures/plugins/mock-welcome-plugin/dashboard.schema.json';

function readSource(relativePath: string): string {
  return readFileSync(join(sourceRoot, relativePath), 'utf8');
}

function renderWithQuery(ui: ReactElement): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('dashboard architecture boundaries', () => {
  it('keeps Developer Core APIs read-only and free of plugin configuration UI', () => {
    const source = readSource('pages/core-apis-page.tsx');
    expect(source).not.toContain('VisualEditor');
    expect(source).not.toContain('EmojiPicker');
    expect(source).not.toContain('Enable Welcome Messages');
    expect(source).not.toContain('DM Welcome settings');
    expect(source).not.toContain('Template editor');
  });

  it('renders mock plugin dashboard content from the plugin dashboard schema', () => {
    const source = readSource(mockWelcomeSchemaPath);
    expect(source).toContain('Welcome messages');
    expect(source).toContain('Leave messages');
    expect(source).toContain('DM Welcome');
    expect(source).toContain('Welcome plugin logs');
  });

  it('routes plugin dashboards through schema content instead of local dynamic imports', () => {
    const detailSource = readSource('pages/plugin-detail-page.tsx');
    expect(detailSource).not.toContain("createWelcomeContentMap");
    expect(detailSource).not.toContain('getPluginContentMap');
    expect(detailSource).toContain('PluginSchemaDashboard');
  });

  it('sidebar reads plugin dashboard metadata for plugin links', () => {
    const source = readSource('components/app-navigation.tsx');
    expect(source).toContain('plugin.enabled && plugin.dashboard');
    expect(source).toContain('plugin.dashboard!.label');
    expect(source).toContain('getGuildPluginPath(guildId, plugin.id)');
  });

  it('documents plugin UI governance in Core APIs without rendering plugin forms', () => {
    const source = readSource('pages/core-apis-page.tsx');
    expect(source).toContain('Plugin UI governance');
    expect(source).toContain('Core renders page shells');
    expect(source).not.toContain('Save template');
  });

  it('provides constrained Core Plugin UI Kit primitives and action variants', () => {
    const source = readSource('components/plugin-ui-kit.tsx');
    expect(source).toContain('PluginEditorLayout');
    expect(source).toContain('PluginSaveBar');
    expect(source).toContain('PluginActionButton');
    expect(source).toContain("'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'");
  });

  it('plugin templates are declared in schema and rendered by Core primitives', () => {
    const source = readSource(mockWelcomeSchemaPath);
    const renderer = readSource('components/plugin-schema-dashboard.tsx');
    expect(source).toContain('"type": "message_composer"');
    expect(source).toContain('"type": "save_template"');
    expect(renderer).toContain('MessageComposer');
    expect(renderer).toContain('md:grid-cols-2');
  });

  it('schema renderer uses shadcn Switch instead of handmade toggles', () => {
    const source = readSource('components/plugin-schema-dashboard.tsx');
    expect(source).toContain('<CoreSwitch');
    expect(source).not.toContain('type="checkbox"');
  });

  it('schema renderer uses shadcn Select and Input for forms', () => {
    const source = readSource('components/plugin-schema-dashboard.tsx');
    expect(source).toContain('<Select');
    expect(source).toContain('<Input');
    expect(source).toContain('<Label');
  });

  it('plugin message tabs support dashboard-managed fields without code editing', () => {
    const source = readSource(mockWelcomeSchemaPath);
    expect(source).toContain('"id": "welcome"');
    expect(source).toContain('"id": "leave"');
    expect(source).toContain('"id": "dm"');
    expect(source).toContain('"type": "channel_select"');
  });

  it('Discord preview uses real bot avatar from API', () => {
    const source = readSource('components/discord-message-preview.tsx');
    expect(source).toContain('botAvatarUrl');
    expect(source).toContain('AvatarImage');
  });

  it('renders Discord preview with real bot name and avatar', () => {
    const html = renderToString(
      <DiscordMessagePreview
        message={{ type: 'text', content: 'Hello [userName]!' }}
        botName="RealBot"
        botAvatarUrl="https://cdn.discordapp.com/avatars/123/avatar.png"
      />,
    );
    expect(html).toContain('RealBot');
    expect(html).toContain('APP');
  });

  it('Core MessageComposer has no Welcome-specific defaults', () => {
    const source = readSource('components/message-composer.tsx');
    expect(source).not.toContain('Welcome [userName]');
    expect(source).not.toContain('Welcome [user] to');
  });

  it('Core VariableInsertMenu has no Welcome-specific default variables', () => {
    const source = readSource('components/variable-insert-menu.tsx');
    expect(source).not.toContain('welcomeVariables');
  });

  it('plugin dashboard schema declares test send action and renderer calls test API', () => {
    const schema = readSource(mockWelcomeSchemaPath);
    const renderer = readSource('components/plugin-schema-dashboard.tsx');
    expect(schema).toContain('Send test welcome message');
    expect(renderer).toContain('testGuildPluginTemplate');
  });

  it('schema renderer fetches real bot profile for preview', () => {
    const source = readSource('components/plugin-schema-dashboard.tsx');
    expect(source).toContain('botProfileQuery');
    expect(source).toContain('botProfile.data?.avatarUrl');
  });

  it('plugin dashboard is fully declared by schema', () => {
    const source = readSource(mockWelcomeSchemaPath);
    expect(source).toContain('"contentMode": "schema"');
    expect(source).toContain('"defaults"');
    expect(source).toContain('"defaultMessages"');
  });

  it('schema renderer saves both settings and template content', () => {
    const source = readSource('components/plugin-schema-dashboard.tsx');
    expect(source).toContain('setGuildPluginStorage');
    expect(source).toContain('saveGuildPluginTemplate');
    expect(source).toContain('toast.success');
  });

  it('schema renderer is responsive with no fixed wide grids', () => {
    const source = readSource('components/plugin-schema-dashboard.tsx');
    expect(source).not.toContain('grid gap-5 xl:grid-cols-[360px_1fr]');
    expect(source).toContain('md:grid-cols-2');
  });

  it('Settings page uses left navigation with grouped sub-pages', () => {
    const source = readSource('pages/settings-page.tsx');
    expect(source).toContain('aside');
    expect(source).toContain('NavLink');
    expect(source).toContain('getSettingsPath(id)');
    expect(source).toContain('General');
    expect(source).toContain('Branding');
    expect(source).toContain('Appearance');
    expect(source).toContain('Security');
    expect(source).toContain('Integrations');
    expect(source).toContain('Advanced');
  });

  it('Settings sections use shadcn form primitives', () => {
    const source = readSource('components/settings/settings-sections.tsx');
    expect(source).toContain('<Input');
    expect(source).toContain('<Select');
    expect(source).toContain('<CoreSwitch');
    expect(source).toContain('<Label');
    expect(source).not.toContain('type="checkbox"');
  });

  it('Settings link in navigation points to real settings route', () => {
    const source = readSource('components/app-navigation.tsx');
    expect(source).toContain('getSettingsPath()');
    expect(source).not.toContain("label: 'Settings',\n        path: '/dashboard/settings',\n        icon: SettingsIcon,\n        disabled: true");
  });

  it('dashboard stats separate total, manageable, and bot-connected counts', () => {
    const source = readSource('components/dashboard-stats.tsx');
    expect(source).toContain('servers.filter((guild) => guild.canManage).length');
    expect(source).toContain('servers.filter((guild) => guild.botConnected).length');
    expect(source).toContain('Total servers');
    expect(source).toContain('Managed servers');
    expect(source).toContain('Bot connected');
  });

  it('Recent Activity fetches real activity events from the API', () => {
    const source = readSource('components/recent-activity.tsx');
    expect(source).toContain('api.getActivity');
    expect(source).toContain('activity.data.data');
  });

  it('moves Logs from Plugins to a Monitoring navigation group', () => {
    const source = readSource('components/app-navigation.tsx');
    expect(source).toContain("label: 'Monitoring'");
    expect(source).toContain('getGuildMonitoringLogsPath(guildId)');
    expect(source).not.toContain("{ label: 'Logs', path: getGuildPluginLogsPath(guildId)");
  });

  it('API guilds module does not import plugins module to avoid circular dependency', () => {
    const source = readSource('../../api/src/guilds/guilds.module.ts');
    expect(source).not.toContain("import { PluginsModule } from '../plugins/plugins.module.js'");
  });

  it('API monitoring module owns the guild logs endpoint', () => {
    const source = readSource('../../api/src/monitoring/monitoring.controller.ts');
    expect(source).toContain("@Get(':guildId/logs')");
    expect(source).toContain('listGuildLogs');
  });

  it('routes monitoring logs outside the plugins path', () => {
    const source = readSource('app.tsx');
    expect(source).toContain(":guildId/monitoring/logs'");
    expect(source).not.toContain(":guildId/plugins/logs'");
  });

  it('applies branding settings to the document at runtime', () => {
    const source = readSource('components/branding-provider.tsx');
    expect(source).toContain('--primary');
    expect(source).toContain('faviconUrl');
    expect(source).toContain('theme-color');
    expect(source).toContain('manifest');
  });

  it('registers the BrandingProvider around the app', () => {
    const source = readSource('main.tsx');
    expect(source).toContain('BrandingProvider');
  });
});

describe('MessageComposer', () => {
  it('switches between Text, Embed, and Components V2 modes', () => {
    const html = renderWithQuery(
      <MessageComposer
        guildId="1111111111111111111"
        mode="text"
        value={createDefaultMessage('text')}
        onModeChange={() => {}}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('Text');
    expect(html).toContain('Embed');
    expect(html).toContain('Components V2');
  });

  it('shows embed color only in Embed mode', () => {
    const embed = renderWithQuery(
      <MessageComposer
        guildId="1111111111111111111"
        mode="embed"
        value={createDefaultMessage('embed')}
        onModeChange={() => {}}
        onChange={() => {}}
      />,
    );
    const components = renderWithQuery(
      <MessageComposer
        guildId="1111111111111111111"
        mode="components_v2"
        value={createDefaultMessage('components_v2')}
        onModeChange={() => {}}
        onChange={() => {}}
      />,
    );
    expect(embed).toContain('Embed color');
    expect(components).not.toContain('Embed color');
  });
});

describe('DiscordMessagePreview', () => {
  it('renders RTL Arabic text without corrupted placeholders', () => {
    const html = renderToString(
      <DiscordMessagePreview message={{ type: 'text', content: 'مرحبا [userName]\nأهلا بك في [serverName]' }} />,
    );
    expect(html).toContain('مرحبا Mira');
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('�');
  });
});

describe('DashboardStats', () => {
  function mockGuilds(data: GuildListResponse['data']) {
    return {
      data: { data },
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve({} as never),
    } as unknown as Parameters<typeof DashboardStats>[0]['guilds'];
  }

  it('computes total, managed, and bot-connected counts', () => {
    const html = renderToString(
      <DashboardStats
        guilds={mockGuilds([
          { id: '1111111111111111111', name: 'A', icon: null, memberCount: 100, canManage: true, isOwner: true, hasAdmin: false, hasManager: false, botConnected: true, action: 'manage', permissionRole: 'OWNER' },
          { id: '1111111111111111112', name: 'B', icon: null, memberCount: 50, canManage: false, isOwner: false, hasAdmin: false, hasManager: false, botConnected: true, action: 'add_bot', permissionRole: null },
          { id: '1111111111111111113', name: 'C', icon: null, memberCount: 200, canManage: true, isOwner: false, hasAdmin: true, hasManager: false, botConnected: false, action: 'manage', permissionRole: 'ADMINISTRATOR' },
          { id: '1111111111111111114', name: 'D', icon: null, memberCount: 150, canManage: true, isOwner: false, hasAdmin: true, hasManager: false, botConnected: true, action: 'manage', permissionRole: 'ADMINISTRATOR' },
          { id: '1111111111111111115', name: 'E', icon: null, memberCount: 80, canManage: false, isOwner: false, hasAdmin: false, hasManager: false, botConnected: false, action: 'add_bot', permissionRole: null },
          { id: '1111111111111111116', name: 'F', icon: null, memberCount: 120, canManage: true, isOwner: false, hasAdmin: false, hasManager: true, botConnected: true, action: 'manage', permissionRole: 'MANAGER' },
          { id: '1111111111111111117', name: 'G', icon: null, memberCount: 90, canManage: true, isOwner: false, hasAdmin: true, hasManager: false, botConnected: false, action: 'manage', permissionRole: 'ADMINISTRATOR' },
        ])}
      />,
    );
    expect(html).toContain('Total servers');
    expect(html).toContain('Managed servers');
    expect(html).toContain('Bot connected');
    expect(html).toContain('>7<');
    expect(html).toContain('>5<');
    expect(html).toContain('>4<');
  });
});

describe('RecentActivity', () => {
  it('renders the activity section heading', () => {
    const html = renderWithQuery(
      <MemoryRouter>
        <RecentActivity />
      </MemoryRouter>,
    );
    expect(html).toContain('Recent activity');
  });
});

describe('sidebar collapse', () => {
  it('provides a sidebar context for collapse state', () => {
    const source = readSource('state/sidebar-context.tsx');
    expect(source).toContain('SidebarProvider');
    expect(source).toContain('useSidebar');
    expect(source).toContain('collapsed');
  });

  it('AppSidebar renders a collapse toggle button', () => {
    const source = readSource('components/app-sidebar.tsx');
    expect(source).toContain('useSidebar');
    expect(source).toContain('SidebarCollapseButton');
  });

  it('DashboardShell shifts layout when sidebar is collapsed', () => {
    const source = readSource('components/dashboard-shell.tsx');
    expect(source).toContain('collapsed ?');
    expect(source).toContain('lg:pl-[72px]');
    expect(source).toContain('lg:pl-64');
  });
});

describe('settings', () => {
  it('Settings sections expose a save button for each group', () => {
    const source = readSource('components/settings/settings-sections.tsx');
    expect(source).toContain('Save general');
    expect(source).toContain('Save branding');
    expect(source).toContain('Save appearance');
    expect(source).toContain('Save PWA');
    expect(source).toContain('Save security');
    expect(source).toContain('Save integrations');
    expect(source).toContain('Save advanced');
  });
});
