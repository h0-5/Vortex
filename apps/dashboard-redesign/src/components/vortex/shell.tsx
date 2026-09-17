"use client";

import { useEffect, useState } from "react";
import {
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  ServerIcon,
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
  plugins: { title: "Plugins", subtitle: "Enable, disable, and configure installed modules" },
  activity: { title: "Activity", subtitle: "Everything happening across this server" },
  logs: { title: "Logs", subtitle: "Live gateway, API, and plugin telemetry" },
  api: { title: "Core API", subtitle: "Versioned REST contract health" },
  settings: { title: "Settings", subtitle: "Branding, appearance, and session security" },
};

const NAV_ITEMS: Array<{ view: VortexView; label: string }> = [
  { view: "overview", label: "Overview" },
  { view: "plugins", label: "Plugins" },
  { view: "activity", label: "Activity" },
  { view: "logs", label: "Logs" },
  { view: "api", label: "Core API" },
  { view: "settings", label: "Settings" },
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

function GatewayChip() {
  const [ping, setPing] = useState(24);
  useEffect(() => {
    const t = setInterval(() => setPing(18 + Math.floor(Math.random() * 26)), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground md:inline-flex">
      <span className="vl-dot vl-dot--live bg-[#12805c] text-[#12805c]" />
      gateway {ping}ms
    </span>
  );
}

function GuildSwitcher({
  guild,
  guilds,
  onSwitchGuild,
  onBrowseServers,
}: Pick<ShellProps, "guild" | "guilds" | "onSwitchGuild" | "onBrowseServers">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex max-w-[220px] items-center gap-2 rounded-md border border-border bg-card py-1.5 pl-1.5 pr-2.5 text-left transition-colors duration-150 hover:border-input focus-visible:outline-ring"
          aria-label="Switch server"
        >
          <GuildAvatar initials={guild.initials} hue={guild.hue} iconUrl={guild.iconUrl} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold leading-tight">
              {guild.name}
            </span>
            <span className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {guild.role.toLowerCase()} · {fmt.format(guild.memberCount)}
            </span>
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Bot-present servers
        </DropdownMenuLabel>
        {guilds
          .filter((g) => g.botPresent && g.id !== guild.id)
          .map((g) => (
            <DropdownMenuItem key={g.id} onClick={() => onSwitchGuild(g)} className="gap-2.5">
              <GuildAvatar initials={g.initials} hue={g.hue} iconUrl={g.iconUrl} size={22} />
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
  );
}

export function DashboardShell(props: ShellProps) {
  const { user, guild, guilds, view, onViewChange, onSwitchGuild, onBrowseServers, onLogout, children } = props;
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
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Masthead row 1 — identity + context */}
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetTrigger asChild>
                <button
                  className="inline-flex rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Open navigation"
                >
                  <MenuIcon className="size-4.5" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-card p-0" >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="border-b border-border p-4">
                    <VortexBrand size={22} />
                  </div>
                  <nav className="flex-1 overflow-y-auto p-3" aria-label="Dashboard">
                    <p className="vl-label mb-2 px-2">Workspace</p>
                    <ul className="flex flex-col">
                      {NAV_ITEMS.map((item) => (
                        <li key={item.view}>
                          <button
                            onClick={() => navigate(item.view)}
                            aria-current={view === item.view ? "page" : undefined}
                            className={cn(
                              "w-full rounded-md px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors",
                              view === item.view
                                ? "bg-accent font-semibold text-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  <div className="border-t border-border p-4">
                    <GuildSwitcher
                      guild={guild}
                      guilds={guilds}
                      onSwitchGuild={(g) => { onSwitchGuild(g); setMobileNav(false); }}
                      onBrowseServers={onBrowseServers}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <VortexBrand size={22} />

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <div className="hidden sm:block">
            <GuildSwitcher
              guild={guild}
              guilds={guilds}
              onSwitchGuild={onSwitchGuild}
              onBrowseServers={onBrowseServers}
            />
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground transition-colors duration-150 hover:border-input hover:text-foreground md:inline-flex"
            >
              <SearchIcon className="size-3.5" aria-hidden="true" />
              Search
              <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
            <GatewayChip />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-md border border-transparent p-1 transition-colors hover:border-border focus-visible:outline-ring"
                  aria-label="Account menu"
                >
                  <UserAvatar name={user.globalName} avatarUrl={user.avatarUrl} size={28} />
                  <span className="hidden max-w-[140px] truncate text-[12.5px] font-semibold lg:block">
                    {user.globalName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate text-[13px]">{user.globalName}</span>
                  <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                    @{user.username}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onBrowseServers} className="gap-2">
                  <ServerIcon className="size-4" aria-hidden="true" />
                  Browse servers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive">
                  <LogOutIcon className="size-4" aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Masthead row 2 — view tabs */}
        <nav
          className="hidden h-11 items-stretch gap-6 overflow-x-auto border-t border-border px-4 sm:flex sm:px-6"
          aria-label="Views"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              data-active={view === item.view}
              aria-current={view === item.view ? "page" : undefined}
              className="vl-tab"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* View header + content */}
      <div className="vl-canvas flex flex-1 flex-col">
        <div className="border-b border-border/70 bg-paper/80">
          <div className="flex flex-col gap-0.5 px-4 pb-5 pt-7 sm:px-6">
            <h1
              className="text-[21px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-grotesk)" }}
            >
              {VIEW_META[view].title}
            </h1>
            <p className="text-[12.5px] text-muted-foreground">{VIEW_META[view].subtitle}</p>
          </div>
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-7">{children}</main>

        <footer className="mt-auto flex items-center justify-between border-t border-border px-4 py-3.5 font-mono text-[10.5px] text-muted-foreground/80 sm:px-6">
          <span>AES-256-GCM · HTTP-only session</span>
          <span>vortex console · v1.0</span>
        </footer>
      </div>

      {/* Command palette */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Type a command or search views…" />
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.view} onSelect={() => navigate(item.view)}>
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { onBrowseServers(); setPaletteOpen(false); }}>
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
