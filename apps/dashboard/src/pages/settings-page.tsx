import { Skeleton, cn } from '@vortex/ui';
import type { AppSettings, AppSettingsSectionId } from '@vortex/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BugIcon,
  FlaskConicalIcon,
  LayoutTemplateIcon,
  PaintbrushIcon,
  PaletteIcon,
  SettingsIcon,
  ShieldIcon,
  SmartphoneIcon,
  UsersIcon,
} from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AdvancedSection,
  AppearanceSection,
  BrandingSection,
  DebugSection,
  GeneralSection,
  IntegrationsSection,
  PwaSection,
  SecuritySection,
} from '../components/settings/settings-sections.js';
import { useAppName } from '../hooks/use-app-name.js';
import { api } from '../lib/api-client.js';
import { getSettingsPath } from '../lib/guild-actions.js';

const sections = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'branding', label: 'Branding', icon: PaletteIcon },
  { id: 'appearance', label: 'Appearance', icon: PaintbrushIcon },
  { id: 'pwa', label: 'PWA', icon: SmartphoneIcon },
  { id: 'debug', label: 'Debug', icon: BugIcon },
  { id: 'security', label: 'Security', icon: ShieldIcon },
  { id: 'integrations', label: 'Integrations', icon: UsersIcon },
  { id: 'advanced', label: 'Advanced', icon: FlaskConicalIcon },
] as const;

type SectionId = (typeof sections)[number]['id'];

function isSectionId(value: string | undefined): value is SectionId {
  return sections.some((section) => section.id === value);
}

export function SettingsPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection: SectionId = isSectionId(section) ? section : 'general';
  const queryClient = useQueryClient();
  const appName = useAppName();

  const settings = useQuery({
    queryKey: ['app-settings'],
    queryFn: api.getSettings,
    staleTime: 30_000,
  });

  const update = useMutation({
    mutationFn: ({ section, patch }: { section: AppSettingsSectionId; patch: Record<string, unknown> }) =>
      api.updateSettingsSection(section, patch),
    onSuccess: (next) => {
      queryClient.setQueryData(['app-settings'], next);
      void queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Settings saved.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to save settings.'),
  });

  if (settings.isLoading) return <SettingsSkeleton />;
  if (settings.isError) {
    return (
      <div className="p-6">
        <p className="text-destructive">{settings.error.message}</p>
      </div>
    );
  }

  const current = settings.data!;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8">
      <aside className="w-full shrink-0 lg:w-56">
        <nav className="sticky top-20 rounded-lg border bg-card p-2">
          <div className="mb-2 flex items-center gap-2 px-3 py-2">
            <LayoutTemplateIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Settings</span>
          </div>
          <ul className="space-y-0.5">
            {sections.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <NavLink
                  to={getSettingsPath(id)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {sections.find((s) => s.id === activeSection)?.label}
          </h1>
          <p className="text-sm text-muted-foreground">Manage platform-wide {appName} configuration.</p>
        </div>
        <SectionContent
          section={activeSection}
          settings={current}
          onSave={(patch) => update.mutate({ section: activeSection, patch })}
          isSaving={update.isPending}
        />
      </main>
    </div>
  );
}

function SectionContent({
  section,
  settings,
  onSave,
  isSaving,
}: {
  section: SectionId;
  settings: AppSettings;
  onSave: (patch: Partial<AppSettings[SectionId]>) => void;
  isSaving: boolean;
}) {
  switch (section) {
    case 'general':
      return <GeneralSection value={settings.general} onSave={onSave} isSaving={isSaving} />;
    case 'branding':
      return <BrandingSection value={settings.branding} onSave={onSave} isSaving={isSaving} />;
    case 'appearance':
      return <AppearanceSection value={settings.appearance} onSave={onSave} isSaving={isSaving} />;
    case 'pwa':
      return <PwaSection value={settings.pwa} onSave={onSave} isSaving={isSaving} />;
    case 'debug':
      return <DebugSection value={settings.debug} onSave={onSave} isSaving={isSaving} />;
    case 'security':
      return <SecuritySection value={settings.security} onSave={onSave} isSaving={isSaving} />;
    case 'integrations':
      return <IntegrationsSection value={settings.integrations} onSave={onSave} isSaving={isSaving} />;
    case 'advanced':
      return <AdvancedSection value={settings.advanced} onSave={onSave} isSaving={isSaving} />;
  }
}

function SettingsSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8">
      <aside className="w-full shrink-0 lg:w-56">
        <Skeleton className="h-80 w-full" />
      </aside>
      <main className="min-w-0 flex-1">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </main>
    </div>
  );
}
