"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
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
  Settings2Icon,
  TicketIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UserMinusIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GuildAvatar } from "@/components/vortex/brand";
import { PluginStudio } from "@/components/vortex/plugin-studio";
import { cn } from "@/lib/utils";
import {
  fmt,
  type ActivityEvent,
  type ActivityType,
  type Guild,
  type Plugin,
  type VortexUser,
} from "@/lib/vortex/data";
import type { VortexView } from "@/components/vortex/shell";

/* ------------------------------ shared bits ------------------------------ */

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("vl-panel rounded-lg", className)}>{children}</section>;
}

function SectionHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
      <div className="flex items-baseline gap-2.5">
        <h3 className="vl-label !text-foreground">{title}</h3>
        {hint ? <span className="text-[11.5px] text-muted-foreground">{hint}</span> : null}
      </div>
      {action}
    </div>
  );
}

/* Line sparkline — single flat stroke, no glow. */
function Sparkline({ points }: { points: number[] }) {
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
        stroke="var(--primary)"
        strokeWidth="1.5"
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
      up: true,
      icon: TrendingUpIcon,
      spark: [12, 14, 13, 16, 15, 18, 17, 20, 19, 22, 21, 24],
    },
    {
      label: "Gateway latency",
      value: `${latency}ms`,
      delta: "shard 0 · stable",
      up: true,
      icon: HeartPulseIcon,
      spark: latencySeries,
    },
    {
      label: "Commands / 24h",
      value: fmt.format(commands24h),
      delta: "+11% vs yesterday",
      up: true,
      icon: ZapIcon,
      spark: [8, 10, 9, 12, 14, 13, 16, 15, 18, 17, 20, 22],
    },
    {
      label: "Uptime · 30d",
      value: "99.98%",
      delta: "3 partial degradations",
      up: true,
      icon: ShieldCheckIcon,
      spark: [24, 24, 23, 24, 24, 22, 24, 24, 23, 24, 24, 24],
    },
  ];

  const quickActions = [
    { label: "Open ticket panel", icon: TicketIcon },
    { label: "Purge messages", icon: EraserIcon },
    { label: "Sync roles", icon: RefreshCwIcon },
    { label: "Broadcast", icon: RadioTowerIcon },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Guild header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <GuildAvatar initials={guild.initials} hue={guild.hue} iconUrl={guild.iconUrl} size={48} />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                className="text-[19px] font-bold tracking-tight"
                style={{ fontFamily: "var(--font-grotesk)" }}
              >
                {guild.name}
              </h2>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#12805c]">
                <span className="vl-dot vl-dot--live bg-[#12805c] text-[#12805c]" />
                online
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {fmt.format(guild.memberCount)} members · {guild.id} · {guild.role.toLowerCase()}
            </p>
          </div>
        </div>
        <button
          onClick={() => onQuickAction("Guild synchronized")}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-input bg-card px-3.5 text-[12.5px] font-semibold transition-colors duration-150 hover:border-ink focus-visible:outline-ring"
        >
          <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          Sync now
        </button>
      </div>

      {/* KPI ledger */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Panel key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="vl-label">{s.label}</p>
              <s.icon className="size-4 text-muted-foreground/70" aria-hidden="true" />
            </div>
            <p className="mt-3 font-mono text-[30px] font-medium leading-none tracking-tight">
              {s.value}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={s.up ? "text-[#12805c]" : "text-destructive"} aria-hidden="true">
                {s.up ? "▲" : "▼"}
              </span>
              {s.delta}
            </p>
            <div className="mt-3 border-t border-border/70 pt-3">
              <Sparkline points={s.spark} />
            </div>
          </Panel>
        ))}
      </div>

      {/* Quick actions + bot status */}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <SectionHead title="Quick actions" hint="one click away" />
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => onQuickAction(a.label)}
                className="group flex items-center gap-3 bg-card px-5 py-4 text-left text-[13px] font-semibold transition-colors duration-150 hover:bg-accent focus-visible:outline-ring"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors group-hover:border-ink group-hover:text-foreground">
                  <a.icon className="size-4" aria-hidden="true" />
                </span>
                {a.label}
                <ArrowRightIcon
                  className="ml-auto size-3.5 text-muted-foreground/50 transition-colors group-hover:text-foreground"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHead
            title="Bot status"
            action={
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#12805c]">
                <span className="vl-dot vl-dot--live bg-[#12805c] text-[#12805c]" />
                connected
              </span>
            }
          />
          <ul className="flex flex-col px-5 py-2">
            {[
              ["Runtime", "discord.js · node 22"],
              ["Shards", "1 / 1 healthy"],
              ["REST ping", `${latency}ms`],
              ["Plugins active", `${enabledCount} of ${plugins.length}`],
            ].map(([k, v]) => (
              <li key={k} className="flex items-baseline border-b border-border/60 py-2.5 last:border-0">
                <span className="text-[12.5px] text-muted-foreground">{k}</span>
                <span className="vl-leader" />
                <span className="font-mono text-[12px]">{v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Recent activity */}
      <Panel>
        <SectionHead
          title="Recent activity"
          action={
            <button
              onClick={() => onNavigate("activity")}
              className="text-[12px] font-semibold text-primary transition-opacity hover:opacity-75"
            >
              View all →
            </button>
          }
        />
        <ul className="flex flex-col divide-y divide-border/70">
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
  { icon: typeof UserPlusIcon; color: string; label: string }
> = {
  join: { icon: UserPlusIcon, color: "#12805c", label: "Join" },
  leave: { icon: UserMinusIcon, color: "#5e5b52", label: "Leave" },
  command: { icon: ZapIcon, color: "#0f5aa8", label: "Command" },
  moderation: { icon: GavelIcon, color: "#b45309", label: "Mod action" },
  alert: { icon: ShieldAlertIcon, color: "#b42318", label: "Alert" },
  update: { icon: WrenchIcon, color: "#17603f", label: "Update" },
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
    <li className="flex items-center gap-4 px-5 py-3.5">
      <span className="vl-dot shrink-0" style={{ background: meta.color, color: meta.color }} />
      <span className="w-24 shrink-0">
        <span className="vl-tag" style={{ color: meta.color, borderColor: `${meta.color}33` }}>
          {meta.label}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">
          <span className="font-semibold">{event.actor}</span>
          <span className="text-muted-foreground"> — {event.message}</span>
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:flex">
        {meta.icon && <meta.icon className="size-3.5" aria-hidden="true" />}
        {timeAgo(event.minutesAgo)}
      </span>
    </li>
  );
}

export function ActivityView({ activity }: { activity: ActivityEvent[] }) {
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const types: Array<ActivityType | "all"> = ["all", "alert", "moderation", "command", "join", "leave", "update"];
  const shown = filter === "all" ? activity : activity.filter((e) => e.type === filter);
  const countFor = (t: ActivityType | "all") =>
    t === "all" ? activity.length : activity.filter((e) => e.type === t).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-9 items-stretch gap-5 overflow-x-auto border-b border-border">
        {types.map((t) => {
          const meta = t === "all" ? null : ACTIVITY_META[t];
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              data-active={filter === t}
              className="vl-tab"
            >
              {t === "all" ? "All events" : meta?.label}
              <span className="font-mono text-[10.5px] text-muted-foreground/70">
                {countFor(t)}
              </span>
            </button>
          );
        })}
      </div>

      <Panel className="overflow-hidden">
        <ul className="flex flex-col divide-y divide-border/70">
          {shown.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
          {shown.length === 0 && (
            <li className="py-12 text-center font-mono text-[12px] text-muted-foreground">
              No events recorded for this filter.
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
  guild,
  user,
}: {
  plugins: Plugin[];
  onToggle: (plugin: Plugin) => void;
  guild: Guild;
  user: VortexUser;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "enabled" | "disabled">("all");
  const [studioPlugin, setStudioPlugin] = useState<Plugin | null>(null);

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex h-9 items-stretch gap-5 overflow-x-auto border-b border-border">
          {(
            [
              ["all", `All · ${plugins.length}`],
              ["enabled", `Active · ${plugins.filter((p) => p.enabled).length}`],
              ["disabled", `Disabled · ${plugins.filter((p) => !p.enabled).length}`],
            ] as Array<[typeof tab, string]>
          ).map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} data-active={tab === value} className="vl-tab">
              {label}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plugins…"
          className="h-9 w-full border-input bg-card text-[13px] lg:w-64"
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="vl-label">Installed modules</p>
          <p className="font-mono text-[10.5px] text-muted-foreground/80">
            {plugins.filter((p) => p.enabled).length}/{plugins.length} active
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {shown.map((plugin) => {
            const Icon = CATEGORY_ICON[plugin.category];
            return (
              <li
                key={plugin.id}
                className="flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-accent/60 lg:flex-row lg:items-center lg:gap-4"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-md border",
                    plugin.enabled
                      ? "border-primary/25 bg-primary/[0.08] text-primary"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-semibold tracking-tight">{plugin.name}</h3>
                    <span className="vl-tag">v{plugin.version}</span>
                    <span className="vl-tag">{plugin.category}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground" dir="auto">
                    {plugin.description}
                  </p>
                </div>

                <span className="hidden shrink-0 font-mono text-[10.5px] text-muted-foreground xl:block">
                  @{plugin.author}
                </span>

                <div className="flex shrink-0 items-center gap-3">
                  {plugin.dashboard ? (
                    <button
                      onClick={() => setStudioPlugin(plugin)}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-[12px] font-semibold transition-colors duration-150 hover:border-ink focus-visible:outline-ring"
                      aria-label={`Configure ${plugin.name}`}
                    >
                      <Settings2Icon className="size-3.5" aria-hidden="true" />
                      <span dir="auto">إعدادات</span>
                    </button>
                  ) : null}
                  <Switch
                    checked={plugin.enabled}
                    onCheckedChange={() => onToggle(plugin)}
                    aria-label={`Toggle ${plugin.name}`}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-12">
            <CheckCircle2Icon className="size-5 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-[13px] font-semibold">No plugins match</p>
            <p className="text-[12px] text-muted-foreground">Try a different search or filter.</p>
          </div>
        )}
      </Panel>

      {studioPlugin ? (
        <PluginStudio
          guild={guild}
          user={user}
          plugin={studioPlugin}
          iconNode={CATEGORY_ICON[studioPlugin.category]}
          onClose={() => setStudioPlugin(null)}
        />
      ) : null}
    </div>
  );
}
