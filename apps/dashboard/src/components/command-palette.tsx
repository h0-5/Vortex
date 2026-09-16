import { CommandPalette as CommandPalettePrimitive, type CommandPaletteItem } from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import {
  ActivityIcon,
  BookOpenIcon,
  FileClockIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ServerIcon,
  SettingsIcon,
  SparklesIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { guildPluginsQuery, guildsQuery } from '../hooks/queries.js';
import {
  getGuildCoreApisPath,
  getGuildDashboardPath,
  getGuildMonitoringLogsPath,
  getGuildPluginPath,
  getGuildPluginsPath,
  getSettingsPath,
} from '../lib/guild-actions.js';
import { useSelectedGuild } from '../state/selected-guild-context.js';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { selectedGuildId } = useSelectedGuild();

  const guilds = useQuery(guildsQuery);
  const plugins = useQuery({
    ...guildPluginsQuery(selectedGuildId ?? ''),
    enabled: Boolean(selectedGuildId),
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const items = useMemo<CommandPaletteItem[]>(() => {
    const manageableGuilds = guilds.data?.data.filter((guild) => guild.canManage) ?? [];
    const enabledPlugins =
      plugins.data?.data.filter((plugin) => plugin.enabled && plugin.dashboard) ?? [];

    const go = (path: string) => () => {
      void navigate(path);
    };

    const base: CommandPaletteItem[] = [
      {
        id: 'go-dashboard',
        label: 'Go to Dashboard',
        group: 'Navigation',
        icon: <LayoutDashboardIcon className="size-4" />,
        shortcut: 'G D',
        onSelect: go('/dashboard'),
      },
      {
        id: 'go-servers',
        label: 'Go to Servers',
        group: 'Navigation',
        icon: <ServerIcon className="size-4" />,
        onSelect: go('/dashboard/select-server'),
      },
      {
        id: 'go-activity',
        label: 'Open Activity',
        group: 'Navigation',
        icon: <ActivityIcon className="size-4" />,
        onSelect: go('/dashboard/activity'),
      },
      {
        id: 'go-settings',
        label: 'Open Settings',
        group: 'Settings',
        icon: <SettingsIcon className="size-4" />,
        onSelect: go(getSettingsPath('general')),
      },
      {
        id: 'go-settings-general',
        label: 'Open General Settings',
        group: 'Settings',
        icon: <SettingsIcon className="size-4" />,
        onSelect: go(getSettingsPath('general')),
      },
      {
        id: 'go-settings-branding',
        label: 'Open Branding Settings',
        group: 'Settings',
        icon: <SettingsIcon className="size-4" />,
        onSelect: go(getSettingsPath('branding')),
      },
    ];

    const guildItems: CommandPaletteItem[] = manageableGuilds.map((guild) => ({
      id: `switch-guild-${guild.id}`,
      label: `Switch to ${guild.name}`,
      group: 'Servers',
      icon: <ServerIcon className="size-4" />,
      onSelect: () => {
        void navigate(getGuildDashboardPath(guild.id));
      },
    }));

    if (!selectedGuildId) {
      return [...base, ...guildItems];
    }

    const guildId = selectedGuildId;
    const guildSpecific: CommandPaletteItem[] = [
      {
        id: 'go-guild-overview',
        label: 'Open server overview',
        group: 'Current server',
        icon: <ServerIcon className="size-4" />,
        onSelect: () => {
          void navigate(getGuildDashboardPath(guildId));
        },
      },
      {
        id: 'go-guild-plugins',
        label: 'Open Installed Plugins',
        group: 'Current server',
        icon: <PackageIcon className="size-4" />,
        onSelect: () => {
          void navigate(getGuildPluginsPath(guildId));
        },
      },
      {
        id: 'go-guild-activity',
        label: 'Open Guild Activity',
        group: 'Current server',
        icon: <ActivityIcon className="size-4" />,
        onSelect: () => {
          void navigate(`/dashboard/${guildId}/activity`);
        },
      },
      {
        id: 'go-guild-logs',
        label: 'Open Plugin Logs',
        group: 'Current server',
        icon: <FileClockIcon className="size-4" />,
        onSelect: () => {
          void navigate(getGuildMonitoringLogsPath(guildId));
        },
      },
      {
        id: 'go-guild-core-apis',
        label: 'Open Core APIs',
        group: 'Current server',
        icon: <BookOpenIcon className="size-4" />,
        onSelect: () => {
          void navigate(getGuildCoreApisPath(guildId));
        },
      },
    ];

    const pluginItems: CommandPaletteItem[] = enabledPlugins.map((plugin) => ({
      id: `open-plugin-${plugin.id}`,
      label: `Open ${plugin.dashboard!.label}`,
      group: 'Plugins',
      icon: <SparklesIcon className="size-4" />,
      onSelect: () => {
        void navigate(getGuildPluginPath(guildId, plugin.id));
      },
    }));

    return [...base, ...guildItems, ...guildSpecific, ...pluginItems];
  }, [guilds.data, navigate, plugins.data, selectedGuildId]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['label', 'group'],
        threshold: 0.4,
      }),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return fuse.search(search).map((result) => result.item);
  }, [fuse, items, search]);

  return (
    <CommandPalettePrimitive
      open={open}
      onOpenChange={setOpen}
      items={filteredItems}
      search={search}
      onSearchChange={setSearch}
      placeholder="Search pages, settings, servers, and plugins..."
    />
  );
}
