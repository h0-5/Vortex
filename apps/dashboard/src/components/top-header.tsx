import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@vortex/ui';
import type { User } from '@vortex/types';
import { MenuIcon, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AppNavigation } from './app-navigation.js';
import { Brand } from './brand.js';
import { ServerSwitcher } from './server-switcher.js';
import { UserMenu } from './user-menu.js';
import { useAppName } from '../hooks/use-app-name.js';

export function TopHeader({ user }: { user: User }) {
  const appName = useAppName();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 max-w-[85vw] bg-sidebar p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <Brand />
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              <ServerSwitcher />
              <AppNavigation forceExpanded />
              <div className="mt-auto pt-4">
                <UserMenu user={user} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Brand compact className="hidden sm:block lg:hidden" />
        <Button
          variant="outline"
          className="hidden min-w-0 flex-1 justify-start text-muted-foreground sm:flex lg:max-w-md"
          disabled
        >
          <SearchIcon data-icon="inline-start" />
          <span className="truncate">Search {appName}</span>
        </Button>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <ServerSwitcher />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
