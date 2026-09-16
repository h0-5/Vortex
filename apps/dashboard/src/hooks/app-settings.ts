import { queryOptions } from '@tanstack/react-query';

import { api } from '../lib/api-client.js';

export const appSettingsQuery = queryOptions({
  queryKey: ['app-settings'],
  queryFn: api.getSettings,
  staleTime: 30_000,
});
