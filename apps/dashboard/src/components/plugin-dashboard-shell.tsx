import { Badge, Button, cn, Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@vortex/ui';
import type { PluginDashboard } from '@vortex/types';
import {
  FileClockIcon,
  InfoIcon,
  SettingsIcon,
  SparklesIcon,
  TerminalIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { PageHeader } from './page-header.js';

export interface PluginTab {
  id: string;
  label: string;
  icon: ReactNode;
}

const defaultTabDefinitions: Record<string, PluginTab> = {
  overview: { id: 'overview', label: 'Overview', icon: <InfoIcon className="size-4" /> },
  settings: { id: 'settings', label: 'Settings', icon: <SettingsIcon className="size-4" /> },
  commands: { id: 'commands', label: 'Commands', icon: <TerminalIcon className="size-4" /> },
  logs: { id: 'logs', label: 'Logs', icon: <FileClockIcon className="size-4" /> },
};

export interface PluginDashboardShellProps {
  guildId: string;
  pluginId: string;
  pluginName: string;
  pluginVersion: string;
  pluginDashboard: PluginDashboard | null;
  pluginEnabled: boolean;
  tabs: string[];
  contentMap: Record<string, ReactNode>;
  onBack: () => void;
}

export function PluginDashboardShell({
  pluginId,
  pluginName,
  pluginVersion,
  pluginDashboard,
  pluginEnabled,
  tabs: tabIds,
  contentMap,
  onBack,
}: PluginDashboardShellProps) {
  const [activeTab, setActiveTab] = useState(tabIds[0] ?? 'overview');

  const tabs = tabIds.map((id) => defaultTabDefinitions[id] ?? { id, label: id, icon: <SparklesIcon className="size-4" /> });
  const activeContent = contentMap[activeTab] ?? <MissingPluginTab pluginId={pluginId} tabId={activeTab} />;

  const dashboardLabel = pluginDashboard?.label ?? pluginName;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Plugin"
        title={dashboardLabel}
        description={`Version ${pluginVersion} — ${pluginEnabled ? 'Active on this server' : 'Disabled on this server'}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={pluginEnabled ? 'success' : 'outline'}>
              {pluginEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Button variant="outline" onClick={onBack}>
              Installed
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <div
          role="tablist"
          aria-orientation="horizontal"
          className="inline-flex h-10 w-full items-center justify-start overflow-x-auto rounded-lg border border-border bg-card p-1 sm:w-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <section className="min-h-64">{activeContent}</section>
      </div>
    </div>
  );
}

function MissingPluginTab({ pluginId, tabId }: { pluginId: string; tabId: string }) {
  return (
    <Empty className="min-h-64 border-dashed border-destructive/40 bg-destructive/5">
      <EmptyHeader>
        <EmptyTitle className="text-base">Plugin dashboard failed to load</EmptyTitle>
        <EmptyDescription>
          Plugin {pluginId} did not provide content for tab {tabId}.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
