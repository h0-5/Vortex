"use client";

import { useEffect, useState } from "react";
import {
  ActivityIcon,
  BlocksIcon,
  BracesIcon,
  ChevronDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  TerminalIcon,
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
import { GuildAvatar, SpaceBackdrop, UserAvatar, VortexBrand } from "@/components/vortex/brand";
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

const NAV_ITEMS: Array<{ view: VortexView; label: string; icon: typeof LayoutDashboardIcon }> = [
  { view: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { view: "plugins", label: "Plugins", icon: BlocksIcon },
  { view: "activity", label: "Activity", icon: ActivityIcon },
  { view: "logs", label: "Logs", icon: TerminalIcon },
  { view: "api", label: "Core API", icon: BracesIcon },
  { view: "settings", label: "Settings", icon: SettingsIcon },
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
    <span className="vx-chip hidden items-center gap-2 px-2.5 py-1.5 md:inline-flex">
      <span className="vx-dot vx-dot--live" style={{ background: "var(--ok)", color: "var(--ok)" }} />
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
          className="flex max-w-[220px] items-center gap-2 rounded-xl border border-[color:var(--glass-brd)] bg-white/[0.04] py-1.5 pl-1.5 pr-2.5 text-left backdrop-blur-md transition-colors duration-150 hover:border-[color:var(--glass-brd-strong)] focus-visible:outline-ring"
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

  const viewIndex = NAV_ITEMS.findIndex((item) => item.view === view);

  return (
    <div className="relative flex min-h-screen">
      <SpaceBackdrop />

      {/* ============ desktop floating dock ============ */}
      <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center gap-1 border-r border-[color:var(--glass-brd)] bg-[color:var(--glass)] py-4 backdrop-blur-xl lg:flex xl:w-[200px] xl:items-stretch xl:px-3">
        <div className="mb-4 grid place-items-center xl:grid-cols-[auto_1fr] xl:justify-items-start xl:gap-2.5 xl:px-1">
          <VortexBrand size={24} />
        </div>

        <nav className="flex w-full flex-col items-center gap-1.5 xl:items-stretch" aria-label="Dashboard">
          {NAV_ITEMS.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onViewChange(item.view)}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "group relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 xl:h-10 xl:w-full xl:justify-start xl:gap-3 xl:px-3",
                  active
                    ? "border-transparent bg-gradient-to-r from-[color:var(--aurora-1)] to-[color:var(--aurora-2)] text-white shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--aurora-1)_90%,transparent)]"
                    : "border-transparent text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-[color:var(--aurora-1)] to-[color:var(--aurora-2)] xl:block"
                  />
                )}
                <item.icon className="size-[18px] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110" aria-hidden="true" />
                <span className="hidden text-[13px] font-semibold xl:block">{item.label}</span>
                {/* tooltip on icon-only mode */}
                <span
                  className={cn(
                    "pointer-events-none absolute left-[calc(100%+10px)] z-50 whitespace-nowrap rounded-md border border-[color:var(--glass-brd)] bg-[color:var(--glass-strong)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 xl:hidden",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3 xl:items-stretch">
          <GatewayChip />
          <div className="hidden h-px w-full bg-[color:var(--glass-brd)] xl:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2.5 rounded-xl border border-transparent p-1.5 transition-colors hover:border-[color:var(--glass-brd)] focus-visible:outline-ring"
                aria-label="Account menu"
              >
                <UserAvatar name={user.globalName} avatarUrl={user.avatarUrl} size={30} />
                <span className="hidden min-w-0 flex-1 text-left xl:block">
                  <span className="block truncate text-[12.5px] font-semibold">{user.globalName}</span>
                  <span className="block truncate font-mono text-[9.5px] text-muted-foreground">@{user.username}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="truncate text-[13px]">{user.globalName}</span>
                <span className="truncate font-mono text-[10.5px] text-muted-foreground">@{user.username}</span>
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
      </aside>

      {/* ============ main column ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-[color:var(--glass-brd)] bg-[color:var(--glass)] backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <div className="lg:hidden">
              <Sheet open={mobileNav} onOpenChange={setMobileNav}>
                <SheetTrigger asChild>
                  <button
                    className="inline-flex rounded-lg border border-[color:var(--glass-brd)] p-2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Open navigation"
                  >
                    <MenuIcon className="size-4.5" aria-hidden="true" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-[color:var(--glass-brd)] bg-[color:var(--popover)] p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <div className="flex h-full flex-col">
                    <div className="border-b border-[color:var(--glass-brd)] p-4">
                      <VortexBrand size={22} />
                    </div>
                    <nav className="flex-1 overflow-y-auto p-3" aria-label="Dashboard">
                      <p className="vx-label mb-2 px-2">workspace</p>
                      <ul className="flex flex-col gap-1">
                        {NAV_ITEMS.map((item) => {
                          const active = view === item.view;
                          return (
                            <li key={item.view}>
                              <button
                                onClick={() => navigate(item.view)}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors",
                                  active
                                    ? "bg-gradient-to-r from-[color:var(--aurora-1)] to-[color:var(--aurora-2)] font-semibold text-white"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                              >
                                <item.icon className="size-4" aria-hidden="true" />
                                {item.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>
                    <div className="border-t border-[color:var(--glass-brd)] p-4">
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

            <div className="lg:hidden">
              <VortexBrand size={22} compact />
            </div>

            <div className="hidden lg:block">
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
                className="hidden items-center gap-2 rounded-xl border border-[color:var(--glass-brd)] bg-white/[0.04] px-3 py-1.5 text-[12px] text-muted-foreground backdrop-blur-md transition-colors duration-150 hover:border-[color:var(--glass-brd-strong)] hover:text-foreground md:inline-flex"
              >
                <SearchIcon className="size-3.5" aria-hidden="true" />
                Search
                <kbd className="ml-2 rounded border border-[color:var(--glass-brd)] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
              <div className="lg:hidden">
                <GatewayChip />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition-colors hover:border-[color:var(--glass-brd)] focus-visible:outline-ring lg:hidden"
                    aria-label="Account menu"
                  >
                    <UserAvatar name={user.globalName} avatarUrl={user.avatarUrl} size={28} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate text-[13px]">{user.globalName}</span>
                    <span className="truncate font-mono text-[10.5px] text-muted-foreground">@{user.username}</span>
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
        </header>

        {/* view header + content */}
        <main className="vx-canvas flex-1 px-4 py-7 sm:px-6 sm:py-8">
          <div key={view} className="anim-rise">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <p className="vx-label" dir="ltr">
                  <span className="text-[color:var(--aurora-2)]">view {String(viewIndex + 1).padStart(2, "0")}</span>
                  {" / "}
                  {VIEW_META[view].title.toLowerCase()}
                </p>
                <h1
                  className="text-[22px] font-bold tracking-tight sm:text-[26px]"
                  style={{ fontFamily: "var(--font-unbounded)" }}
                >
                  {VIEW_META[view].title}
                </h1>
                <p className="text-[12.5px] text-muted-foreground">{VIEW_META[view].subtitle}</p>
              </div>
              <div className="vx-grad-line hidden w-40 self-end opacity-70 sm:block" />
            </div>
            {children}
          </div>
        </main>

        <footer className="mt-auto flex items-center justify-between border-t border-[color:var(--glass-brd)] px-4 py-3.5 font-mono text-[10.5px] text-muted-foreground/70 sm:px-6">
          <span>AES-256-GCM · HTTP-only session</span>
          <span>vortex nexus · v2.0</span>
        </footer>
      </div>

      {/* Command palette */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Type a command or search views…" />
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.view} onSelect={() => navigate(item.view)}>
              <item.icon className="size-4" aria-hidden="true" />
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
