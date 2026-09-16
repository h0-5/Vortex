import type { GuildPlugin } from '@vortex/types';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIcon,
  BookOpenIcon,
  FileClockIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ServerIcon,
  SettingsIcon,
  SparklesIcon,
  StoreIcon,
  type LucideIcon,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { guildPluginsQuery } from '../hooks/queries.js';
import {
  getGuildCoreApisPath,
  getGuildMonitoringLogsPath,
  getGuildPluginPath,
  getGuildPluginsPath,
  getSettingsPath,
} from '../lib/guild-actions.js';
import { useSidebar } from '../state/sidebar-context.js';
import { SidebarNavGroup, type SidebarNavItemData } from './sidebar/index.js';

export type NavigationItem = SidebarNavItemData;

export interface NavigationGroup {
  type: 'primary' | 'footer';
  label: string;
  items: NavigationItem[];
}

export function AppNavigation({ forceExpanded = false }: { forceExpanded?: boolean }) {
  const { collapsed } = useSidebar();
  const effectiveCollapsed = forceExpanded ? false : collapsed;
  const groups = useNavigationGroups();

  return (
    <nav className="flex flex-col gap-6" aria-label="Primary navigation">
      {groups.map((group) => (
        <SidebarNavGroup
          key={group.label}
          label={group.label}
          items={group.items}
          collapsed={effectiveCollapsed}
        />
      ))}
    </nav>
  );
}

export function useNavigationGroups(): NavigationGroup[] {
  const location = useLocation();
  const routeGuildId = getRouteGuildId(location.pathname);
  const plugins = useQuery({
    ...guildPluginsQuery(routeGuildId ?? ''),
    enabled: routeGuildId !== null,
  });

  return getNavigationGroups(routeGuildId, plugins.data?.data ?? []);
}

function getRouteGuildId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/(\d{17,20})(?:\/|$)/u);
  return match?.[1] ?? null;
}

function getNavigationGroups(guildId: string | null, plugins: GuildPlugin[]): NavigationGroup[] {
  const groups: NavigationGroup[] = [
    {
      type: 'primary',
      label: 'Workspace',
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboardIcon,
          end: true,
        },
        {
          label: 'Servers',
          path: '/dashboard/select-server',
          icon: ServerIcon,
        },
      ],
    },
  ];

  if (guildId) {
    const enabledWithDashboard = plugins.filter((plugin) => plugin.enabled && plugin.dashboard);
    const pluginItems: NavigationItem[] = [
      { label: 'Installed', path: getGuildPluginsPath(guildId), icon: PackageIcon, end: true },
    ];

    for (const plugin of enabledWithDashboard) {
      pluginItems.push({
        label: plugin.dashboard!.label,
        path: getGuildPluginPath(guildId, plugin.id),
        icon: getIconByName(plugin.dashboard!.icon),
      });
    }

    pluginItems.push({
      label: 'Store',
      path: `${getGuildPluginsPath(guildId)}/store`,
      icon: StoreIcon,
      disabled: true,
      note: 'Soon',
    });

    groups.push({
      type: 'primary',
      label: 'Plugins',
      items: pluginItems,
    });
    groups.push({
      type: 'primary',
      label: 'Monitoring',
      items: [
        {
          label: 'Activity',
          path: `/dashboard/${guildId}/activity`,
          icon: ActivityIcon,
        },
        {
          label: 'Logs',
          path: getGuildMonitoringLogsPath(guildId),
          icon: FileClockIcon,
        },
      ],
    });
    groups.push({
      type: 'primary',
      label: 'Developer',
      items: [
        {
          label: 'Core APIs',
          path: getGuildCoreApisPath(guildId),
          icon: BookOpenIcon,
        },
      ],
    });
  }

  groups.push({
    type: 'footer',
    label: 'System',
    items: [
      {
        label: 'Settings',
        path: getSettingsPath(),
        icon: SettingsIcon,
      },
    ],
  });

  return groups;
}

const iconMap: Record<string, LucideIcon> = {
  Sparkles: SparklesIcon,
  Plug: PackageIcon,
  Settings: SettingsIcon,
};

function getIconByName(name: string): LucideIcon {
  return iconMap[name] ?? PackageIcon;
}
