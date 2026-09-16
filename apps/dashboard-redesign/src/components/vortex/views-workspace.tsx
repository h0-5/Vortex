"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ClockIcon,
  EraserIcon,
  Gamepad2Icon,
  GavelIcon,
  HeartPulseIcon,
  LifeBuoyIcon,
  PuzzleIcon,
  RefreshCwIcon,
  RadioTowerIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TicketIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UserMinusIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuildAvatar } from "@/components/vortex/brand";
import { cn } from "@/lib/utils";
import {
  fmt,
  type ActivityEvent,
  type ActivityType,
  type Guild,
  type Plugin,
} from "@/lib/vortex/data";
import type { VortexView } from "@/components/vortex/shell";

/* ------------------------------ shared bits ------------------------------ */

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("nx-panel rounded-xl", className)}>{children}</section>;
}

function Sparkline({ points, stroke }: { points: number[]; stroke: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const coords = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${28 - ((p - min) / range) * 24 - 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
      <polyline
        points={coords}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------- Overview -------------------------------- */

export function OverviewView({
  guild,
  plugins,
  activity,
  onNavigate,
  onQuickAction,
}: {
  guild: Guild;
  plugins: Plugin[];
  activity: ActivityEvent[];
  onNavigate: (v: VortexView) => void;
  onQuickAction: (label: string) => void;
}) {
  const [latency, setLatency] = useState(24);
  const [commands24h, setCommands24h] = useState(8412);
  useEffect(() => {
    const t = setInterval(() => {
      setLatency(18 + Math.floor(Math.random() * 26));
      setCommands24h((c) => c + Math.floor(Math.random() * 7));
    }, 2400);
    return () => clearInterval(t);
  }, []);

  const enabledCount = plugins.filter((p) => p.enabled).length;
  const latencySeries = Array.from({ length: 14 }, (_, i) => 18 + ((i * 7 + latency) % 30));

  const stats = [
    {
      label: "Members",
      value: fmt.format(guild.memberCount),
      delta: "+3.2% this week",
      icon: TrendingUpIcon,
      spark: [12, 14, 13, 16, 15, 18, 17, 20, 19, 22, 21, 24],
      color: "#8b5cf6",
    },
    {
      label: "Gateway latency",
      value: `${latency}ms`,
      delta: "shard 0 · stable",
      icon: HeartPulseIcon,
      spark: latencySeries,
      color: "#06b6d4",
    },
    {
      label: "Commands / 24h",
      value: fmt.format(commands24h),
      delta: "+11% vs yesterday",
      icon: ZapIcon,
      spark: [8, 10, 9, 12, 14, 13, 16, 15, 18, 17, 20, 22],
      color: "#6366f1",
    },
    {
      label: "Uptime · 30d",
      value: "99.98%",
      delta: "3 partial degradations",
      icon: ShieldCheckIcon,
      spark: [24, 24, 23, 24, 24, 22, 24, 24, 23, 24, 24, 24],
      color: "#34d399",
    },
  ];

  const quickActions = [
    { label: "Open ticket panel", icon: TicketIcon },
    { label: "Purge messages", icon: EraserIcon },
    { label: "Sync roles", icon: RefreshCwIcon },
    { label: "Broadcast", icon: RadioTowerIcon },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Guild header */}
      <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <GuildAvatar initials={guild.initials} hue={guild.hue} size={52} />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-extrabold tracking-tight">{guild.name}</h2>
              <Badge className="border-transparent bg-[#34d399]/12 font-mono text-[10px] uppercase tracking-wider text-[#34d399] hover:bg-[#34d399]/20">
                bot online
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmt.format(guild.onlineCount)} online now · guild id{" "}
              <span className="font-mono">{guild.id}</span> · {guild.role.toLowerCase()} access
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onQuickAction("Guild synchronized")}
          className="gap-2 border-border bg-transparent hover:border-primary/50 hover:bg-primary/10"
        >
          <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          Sync now
        </Button>
      </Panel>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Panel key={s.label} className="group p-5 transition-colors duration-200 hover:border-primary/35">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <s.icon className="size-4 text-muted-foreground/70 transition-colors duration-200 group-hover:text-primary" aria-hidden="true" />
            </div>
            <p className="nx-gradient-text mt-2.5 font-mono text-[26px] font-bold leading-none tracking-tight">
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{s.delta}</p>
            <div className="mt-3 opacity-80">
              <Sparkline points={s.spark} stroke={s.color} />
            </div>
          </Panel>
        ))}
      </div>

      {/* Quick actions + bot status */}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Panel className="p-5">
          <h3 className="text-sm font-bold tracking-tight">Quick actions</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Frequent moderator and admin operations, one click away.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => onQuickAction(a.label)}
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-white/[0.015] px-4 py-3.5 text-left text-[13px] font-semibold transition-all duration-150 hover:border-primary/45 hover:bg-primary/[0.07] focus-visible:outline-ring"
              >
                <span className="nx-gradient flex size-8 items-center justify-center rounded-md text-white">
                  <a.icon className="size-4" aria-hidden="true" />
                </span>
                {a.label}
                <ArrowRightIcon className="ml-auto size-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight">Bot status</h3>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34d399]">
              <span className="nx-live-dot inline-block size-1.5 rounded-full bg-[#34d399] text-[#34d399]" />
              connected
            </span>
          </div>
          <ul className="mt-4 flex flex-col gap-3 text-[13px]">
            {[
              ["Runtime", "discord.js · node 22"],
              ["Shards", "1 / 1 healthy"],
              ["REST ping", `${latency}ms`],
              ["Plugins active", `${enabledCount} of ${plugins.length}`],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-mono text-xs">{v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Recent activity */}
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight">Recent activity</h3>
          <button
            onClick={() => onNavigate("activity")}
            className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            View all →
          </button>
        </div>
        <ul className="mt-4 flex flex-col">
          {activity.slice(0, 5).map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------- Activity -------------------------------- */

const ACTIVITY_META: Record<
  ActivityType,
  { icon: typeof UserPlusIcon; color: string; bg: string; label: string }
> = {
  join: { icon: UserPlusIcon, color: "#34d399", bg: "rgba(52,211,153,0.12)", label: "Join" },
  leave: { icon: UserMinusIcon, color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "Leave" },
  command: { icon: ZapIcon, color: "#22d3ee", bg: "rgba(34,211,238,0.1)", label: "Command" },
  moderation: { icon: GavelIcon, color: "#fbbf24", bg: "rgba(251,191,36,0.1)", label: "Mod action" },
  alert: { icon: ShieldAlertIcon, color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Alert" },
  update: { icon: WrenchIcon, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", label: "Update" },
};

function timeAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const meta = ACTIVITY_META[event.type];
  return (
    <li className="flex items-start gap-3.5 border-b border-border/40 py-3.5 last:border-0 last:pb-0">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: meta.bg, color: meta.color }}
      >
        <meta.icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold">{event.actor}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{event.message}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground/70">
        <ClockIcon className="size-3" aria-hidden="true" />
        {timeAgo(event.minutesAgo)}
      </span>
    </li>
  );
}

export function ActivityView({ activity }: { activity: ActivityEvent[] }) {
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const types: Array<ActivityType | "all"> = ["all", "alert", "moderation", "command", "join", "leave", "update"];
  const shown = filter === "all" ? activity : activity.filter((e) => e.type === filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {types.map((t) => {
          const active = filter === t;
          const meta = t === "all" ? null : ACTIVITY_META[t];
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-ring",
                active
                  ? "border-primary/60 bg-primary/12 text-foreground"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {meta && <meta.icon className="mr-1.5 inline size-3.5" style={{ color: meta.color }} aria-hidden="true" />}
              {t === "all" ? "All events" : meta?.label}
            </button>
          );
        })}
      </div>

      <Panel className="p-5">
        <ul className="flex flex-col">
          {shown.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
          {shown.length === 0 && (
            <li className="py-10 text-center text-sm text-muted-foreground">
              No events of this type yet.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------- Plugins --------------------------------- */

const CATEGORY_ICON: Record<Plugin["category"], typeof ShieldCheckIcon> = {
  Moderation: GavelIcon,
  Tickets: LifeBuoyIcon,
  Utility: WrenchIcon,
  Analytics: BarChart3Icon,
  Security: ShieldCheckIcon,
  Fun: Gamepad2Icon,
};

export function PluginsView({
  plugins,
  onToggle,
}: {
  plugins: Plugin[];
  onToggle: (plugin: Plugin) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "enabled" | "disabled">("all");

  const shown = plugins.filter((p) => {
    const matchQuery =
      query.trim() === "" ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase());
    const matchTab =
      tab === "all" || (tab === "enabled" ? p.enabled : !p.enabled);
    return matchQuery && matchTab;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-white/[0.04]">
            <TabsTrigger value="all" className="text-xs">All ({plugins.length})</TabsTrigger>
            <TabsTrigger value="enabled" className="text-xs">
              Active ({plugins.filter((p) => p.enabled).length})
            </TabsTrigger>
            <TabsTrigger value="disabled" className="text-xs">
              Disabled ({plugins.filter((p) => !p.enabled).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plugins…"
          className="h-9 w-full border-border/70 bg-white/[0.02] text-[13px] sm:w-64"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((plugin) => {
          const Icon = CATEGORY_ICON[plugin.category];
          return (
            <Panel
              key={plugin.id}
              className={cn(
                "flex flex-col p-5 transition-all duration-200 hover:border-primary/35",
                plugin.enabled && "nx-gradient-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    plugin.enabled ? "nx-gradient text-white nx-glow" : "bg-white/[0.05] text-muted-foreground",
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <Switch
                  checked={plugin.enabled}
                  onCheckedChange={() => onToggle(plugin)}
                  aria-label={`Toggle ${plugin.name}`}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h3 className="text-[15px] font-bold tracking-tight">{plugin.name}</h3>
                <span className="rounded border border-border/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  v{plugin.version}
                </span>
              </div>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                {plugin.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <PuzzleIcon className="size-3" aria-hidden="true" />
                  {plugin.category} · @{plugin.author}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] uppercase",
                    plugin.enabled
                      ? "border-[#34d399]/30 text-[#34d399]"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {plugin.enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
            </Panel>
          );
        })}
      </div>

      {shown.length === 0 && (
        <Panel className="flex flex-col items-center gap-2 p-12 text-center">
          <CheckCircle2Icon className="size-6 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-semibold">No plugins match</p>
          <p className="text-xs text-muted-foreground">Try a different search or filter.</p>
        </Panel>
      )}
    </div>
  );
}
