import { useQuery } from '@tanstack/react-query';

import { appSettingsQuery } from './app-settings.js';

export function useBranding() {
  const { data: settings } = useQuery(appSettingsQuery);
  return {
    appName: settings?.general.appName ?? 'Vortex',
    logoUrl: settings?.branding.logoUrl ?? null,
    faviconUrl: settings?.branding.faviconUrl ?? null,
    primaryColor: settings?.branding.primaryColor ?? '#5865f2',
    pwaEnabled: settings?.pwa.enabled ?? false,
  };
}
