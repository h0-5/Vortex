import { useQuery } from '@tanstack/react-query';

import { appSettingsQuery } from './app-settings.js';

export function useAppName(): string {
  const { data: settings } = useQuery(appSettingsQuery);
  return settings?.general.appName ?? 'Vortex';
}
