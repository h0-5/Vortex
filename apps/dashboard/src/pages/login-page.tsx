import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, DatabaseIcon, ServerIcon, ShieldCheckIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { Brand } from '../components/brand.js';
import { currentUserQuery } from '../hooks/queries.js';
import { ApiError } from '../lib/api-client.js';

const platformPoints = [
  {
    title: 'Secure Discord OAuth',
    description: 'Your Discord credentials remain server-side.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Multi-server foundation',
    description: 'One focused workspace for every server you manage.',
    icon: ServerIcon,
  },
  {
    title: 'Persistent core data',
    description: 'Accounts and server context backed by PostgreSQL.',
    icon: DatabaseIcon,
  },
];

export function LoginPage() {
  const userQuery = useQuery(currentUserQuery);

  if (userQuery.isLoading) {
    return <LoginLoading />;
  }
  if (userQuery.isSuccess) {
    return <Navigate to="/dashboard" replace />;
  }
  if (userQuery.error instanceof ApiError && userQuery.error.status !== 401) {
    throw userQuery.error;
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
      <section className="hidden border-r border-border bg-sidebar p-10 lg:flex lg:flex-col">
        <Brand />
        <div className="my-auto flex max-w-xl flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Discord infrastructure, organized
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              A serious control plane for your Discord servers.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Vortex brings account access, server visibility, and bot status into one clear
              operational workspace.
            </p>
          </div>
          <div className="grid gap-5">
            {platformPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-sidebar-foreground">{point.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{point.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Open-source Vortex core foundation</p>
      </section>

      <section className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:px-12">
        <Brand className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center py-10">
          <Card className="w-full max-w-md gap-0 py-0">
            <CardHeader className="px-6 pb-5 pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Secure access
              </p>
              <CardTitle className="mt-2 text-xl">Sign in to Vortex</CardTitle>
              <CardDescription className="mt-2 leading-6">
                Continue with Discord to access your dashboard and managed servers.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="px-6 py-5">
              <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                <ShieldCheckIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Vortex requests your identity and server list. OAuth tokens are encrypted and
                  never exposed to the browser.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border px-6 py-5">
              <Button asChild className="w-full">
                <a href="/api/v1/auth/discord">
                  Continue with Discord
                  <ArrowRightIcon data-icon="inline-end" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you authorize Vortex to read your Discord profile and server list.
        </p>
      </section>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md gap-0 py-0">
        <CardHeader className="gap-3 p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <Separator />
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter className="border-t border-border p-6">
          <Skeleton className="h-9 w-full" />
        </CardFooter>
      </Card>
    </main>
  );
}
