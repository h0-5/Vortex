import { Skeleton } from '@vortex/ui';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppErrorBoundary } from './app-error-boundary.js';
import { AuthGate } from './components/auth-gate.js';

const LoginPage = lazy(() =>
  import('./pages/login-page.js').then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/dashboard-page.js').then((module) => ({ default: module.DashboardPage })),
);
const SelectServerPage = lazy(() =>
  import('./pages/select-server-page.js').then((module) => ({ default: module.SelectServerPage })),
);
const GuildOverviewPage = lazy(() =>
  import('./pages/guild-overview-page.js').then((module) => ({
    default: module.GuildOverviewPage,
  })),
);
const GuildPluginsPage = lazy(() =>
  import('./pages/guild-plugins-page.js').then((module) => ({
    default: module.GuildPluginsPage,
  })),
);
const PluginLogsPage = lazy(() =>
  import('./pages/plugin-logs-page.js').then((module) => ({
    default: module.PluginLogsPage,
  })),
);
const ActivityPage = lazy(() =>
  import('./pages/activity-page.js').then((module) => ({
    default: module.ActivityPage,
  })),
);
const CoreApisPage = lazy(() =>
  import('./pages/core-apis-page.js').then((module) => ({
    default: module.CoreApisPage,
  })),
);
const PluginDetailPage = lazy(() =>
  import('./pages/plugin-detail-page.js').then((module) => ({
    default: module.PluginDetailPage,
  })),
);
const SettingsPage = lazy(() =>
  import('./pages/settings-page.js').then((module) => ({
    default: module.SettingsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./pages/not-found-page.js').then((module) => ({ default: module.NotFoundPage })),
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <LazyRoute component={<LoginPage />} />,
    errorElement: <AppErrorBoundary />,
  },
  {
    path: '/dashboard',
    element: <AuthGate />,
    errorElement: <AppErrorBoundary />,
    children: [
      { index: true, element: <LazyRoute component={<DashboardPage />} /> },
      {
        path: 'select-server',
        element: <LazyRoute component={<SelectServerPage />} />,
      },
      {
        path: 'activity',
        element: <LazyRoute component={<ActivityPage />} />,
      },
      {
        path: ':guildId',
        element: <LazyRoute component={<GuildOverviewPage />} />,
      },
      {
        path: ':guildId/plugins',
        element: <LazyRoute component={<GuildPluginsPage />} />,
      },
      {
        path: ':guildId/activity',
        element: <LazyRoute component={<ActivityPage />} />,
      },
      {
        path: ':guildId/logs',
        element: <LazyRoute component={<PluginLogsPage />} />,
      },
      {
        path: ':guildId/monitoring/logs',
        element: <LazyRoute component={<PluginLogsPage />} />,
      },
      {
        path: ':guildId/plugins/:pluginId',
        element: <LazyRoute component={<PluginDetailPage />} />,
      },
      {
        path: ':guildId/developer/core-apis',
        element: <LazyRoute component={<CoreApisPage />} />,
      },
      {
        path: 'settings/:section?',
        element: <LazyRoute component={<SettingsPage />} />,
      },
    ],
  },
  {
    path: '*',
    element: <LazyRoute component={<NotFoundPage />} />,
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

function LazyRoute({ component }: { component: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{component}</Suspense>;
}

function RouteLoading() {
  return (
    <main className="mx-auto flex min-h-64 max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
    </main>
  );
}
