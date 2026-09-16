"use client";

import { useEffect, useState } from "react";
import {
  ActivityIcon,
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  PuzzleIcon,
  ScrollTextIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GuildAvatar, VortexBrand, UserAvatar } from "@/components/vortex/brand";
import { cn } from "@/lib/utils";
import { fmt, type Guild, type VortexUser } from "@/lib/vortex/data";

export type VortexView = "overview" | "plugins" | "activity" | "logs" | "api" | "settings";

export const VIEW_META: Record<VortexView, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Live workspace status and quick actions" },
  plugins: { title: "Plugins", subtitle: "Enable, disable, and audit installed modules" },
  activity: { title: "Activity", subtitle: "Everything happening across this server" },
  logs: { title: "Logs", subtitle: "Live gateway, API, and plugin telemetry" },
  api: { title: "Core API", subtitle: "Versioned REST contract health" },
  settings: { title: "Settings", subtitle: "Branding, appearance, and session security" },
};

const NAV_SECTIONS: Array<{
  label: string;
  items: Array<{ view: VortexView; label: string; icon: typeof LayoutDashboardIcon }>;
}> = [
  {
    label: "Workspace",
    items: [
      { view: "overview", label: "Overview", icon: LayoutDashboardIcon },
      { view: "plugins", label: "Plugins", icon: PuzzleIcon },
      { view: "activity", label: "Activity", icon: ActivityIcon },
    ],
  },
  {
    label: "Platform",
    items: [
      { view: "logs", label: "Logs", icon: ScrollTextIcon },
      { view: "api", label: "Core API", icon: ServerIcon },
      { view: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

interface ShellProps {
  user: VortexUser;
  guild: Guild;
  guilds: Guild[];
  view: VortexView;
  onViewChange: (view: VortexView) => void;
  onSwitchGuild: (guild: Guild) => void;
  onBrowseServers: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

function GatewayPill() {
  const [ping, setPing] = useState(24);
  useEffect(() => {
    const t = setInterval(() => setPing(18 + Math.floor(Math.random() * 26)), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="nx-panel hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex">
      <span className="nx-live-dot inline-block size-1.5 rounded-full bg-[#34d399] text-[#34d399]" />
      <span className="font-mono">{ping}ms</span>
      <span className="text-muted-foreground">gateway</span>
    </span>
  );
}

function SidebarContent({
  user,
  guild,
  guilds,
  view,
  onViewChange,
  onSwitchGuild,
  onBrowseServers,
  onLogout,
}: Omit<ShellProps, "children">) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-5">
        <VortexBrand size={30} />
      </div>

      {/* Server switcher */}
      <div className="px-3 pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="nx-panel flex w-full items-center gap-2.5 rounded-lg p-2.5 text-left transition-colors duration-150 hover:border-primary/40 focus-visible:outline-ring">
              <GuildAvatar initials={guild.initials} hue={guild.hue} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">{guild.name}</span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {guild.role.toLowerCase()}
                </span>
              </span>
              <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 border-border bg-popover">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Bot-present servers
            </DropdownMenuLabel>
            {guilds
              .filter((g) => g.botPresent && g.id !== guild.id)
              .map((g) => (
                <DropdownMenuItem key={g.id} onClick={() => onSwitchGuild(g)} className="gap-2.5">
                  <GuildAvatar initials={g.initials} hue={g.hue} size={22} />
                  <span className="truncate text-[13px]">{g.name}</span>
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBrowseServers} className="gap-2 text-primary">
              <ServerIcon className="size-4" aria-hidden="true" />
              Browse all servers
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = view === item.view;
                return (
                  <li key={item.view}>
                    <button
                      onClick={() => onViewChange(item.view)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150 focus-visible:outline-ring",
                        active
                          ? "bg-white/[0.05] text-foreground"
                          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                      )}
                    >
                      {active && (
                        <span className="nx-gradient absolute left-0 top-1/2 h-4.5 w-[3px] -translate-y-1/2 rounded-full" />
                      )}
                      <item.icon
                        className={cn("size-4.5 shrink-0", active && "text-primary")}
                        aria-hidden="true"
                      />
                      {item.label}
                      {active && (
                        <span className="nx-glow ml-auto size-1 rounded-full bg-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-border/60 p-3">
        <div className="nx-panel flex items-center gap-2.5 rounded-lg p-2.5">
          <UserAvatar name={user.globalName} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold">{user.globalName}</span>
            <span className="block truncate font-mono text-[10px] text-muted-foreground">
              @{user.username}
            </span>
          </span>
          <button
            onClick={onLogout}
            aria-label="Log out"
            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-white/5 hover:text-destructive"
          >
            <LogOutIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell(props: ShellProps) {
  const { user, view, onViewChange, onLogout, children } = props;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (v: VortexView) => {
    onViewChange(v);
    setPaletteOpen(false);
    setMobileNav(false);
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/60 bg-sidebar lg:block">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetTrigger asChild>
          <button
            className="nx-panel absolute left-4 top-3.5 z-40 inline-flex rounded-lg p-2.5 text-muted-foreground lg:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon className="size-5" aria-hidden="true" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent {...props} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-black/85 px-5 backdrop-blur-md sm:px-7 lg:pl-7">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-[15px] font-bold tracking-tight">{VIEW_META[view].title}</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {VIEW_META[view].subtitle}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="nx-panel hidden items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-foreground md:inline-flex"
            >
              <SearchIcon className="size-3.5" aria-hidden="true" />
              Search…
              <kbd className="pointer-events-none ml-3 rounded border border-border bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
            <GatewayPill />
            <div className="lg:hidden">
              <UserAvatar name={user.globalName} size={32} />
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 sm:px-7 sm:py-8">{children}</main>

        <footer className="mt-auto flex items-center justify-between border-t border-border/60 px-5 py-3.5 text-[11px] text-muted-foreground/60 sm:px-7">
          <span className="flex items-center gap-1.5">
            <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
            AES-256-GCM · HTTP-only session
          </span>
          <span className="font-mono">vortex · phase 1</span>
        </footer>
      </div>

      {/* Command palette */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Type a command or search views…" />
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV_SECTIONS.flatMap((s) => s.items).map((item) => (
            <CommandItem key={item.view} onSelect={() => navigate(item.view)}>
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { props.onBrowseServers(); setPaletteOpen(false); }}>
            <ServerIcon className="size-4" aria-hidden="true" />
            Browse all servers
          </CommandItem>
          <CommandItem onSelect={onLogout}>
            <LogOutIcon className="size-4" aria-hidden="true" />
            Log out
          </CommandItem>
        </CommandGroup>
      </CommandDialog>
    </div>
  );
}
