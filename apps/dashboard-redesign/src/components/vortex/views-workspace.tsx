"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  EraserIcon,
  Gamepad2Icon,
  GavelIcon,
  LifeBuoyIcon,
  PuzzleIcon,
  RefreshCwIcon,
  RadioTowerIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Settings2Icon,
  TicketIcon,
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

function Panel({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("vl-panel rounded-lg", className)} style={style}>
      {children}
    </section>
  );
}

function PanelHead({
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

/* Count-up used by the hero KPI strip. */
function useCountUp(target: number, duration = 950): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/* Flat pine sparkline that draws itself on mount. */
function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const coords = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${28 - ((p - min) / range) * 24 - 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-6 w-full", className)} aria-hidden="true">
      <polyline
        points={coords}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="anim-draw"
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
  const latencySeries = useMemo(
    () => Array.from({ length: 14 }, (_, i) => 18 + ((i * 7 + latency) % 30)),
    [latency],
  );

  const animatedMembers = useCountUp(guild.memberCount);
  const animatedCommands = useCountUp(commands24h);

  /* KPI strip lives inside the hero band now — one wide ledger row. */
  const kpis = [
    {
      label: "Members",
      value: fmt.format(animatedMembers),
      delta: "+3.2% this week",
      spark: [12, 14, 13, 16, 15, 18, 17, 20, 19, 22, 21, 24],
    },
    {
      label: "Gateway",
      value: `${latency}ms`,
      delta: "shard 0 · stable",
      spark: latencySeries,
    },
    {
      label: "Commands / 24h",
      value: fmt.format(animatedCommands),
      delta: "+11% vs yesterday",
      spark: [8, 10, 9, 12, 14, 13, 16, 15, 18, 17, 20, 22],
    },
    {
      label: "Uptime · 30d",
      value: "99.98%",
      delta: "3 partial degradations",
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
    <div className="flex flex-col gap-4">
      {/* Hero band: identity + inline KPI ledger */}
      <Panel className="anim-rise overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                <span
                  className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em]"
                  style={{ color: "var(--ok)" }}
                >
                  <span className="vl-dot vl-dot--live" style={{ background: "var(--ok)", color: "var(--ok)" }} />
                  online
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {guild.id} · {guild.role.toLowerCase()} access
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

        <div className="grid grid-cols-2 border-t border-border lg:grid-cols-4">
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className={cn(
                "anim-rise px-5 py-4",
                [
                  "",
                  "border-l",
                  "border-t lg:border-t-0 lg:border-l",
                  "border-t border-l lg:border-t-0",
                ][i],
              )}
              style={{ "--i": i + 2 } as React.CSSProperties}
            >
              <p className="vl-label">{k.label}</p>
              <p className="mt-2 font-mono text-[26px] font-medium leading-none tracking-tight">{k.value}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                <span style={{ color: "var(--ok)" }} aria-hidden="true">▲ </span>
                {k.delta}
              </p>
              <div className="mt-2">
                <Sparkline points={k.spark} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Asymmetric split: live timeline left, operations rail right */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Panel className="anim-rise" style={{ "--i": 1 } as React.CSSProperties}>
          <PanelHead
            title="Live timeline"
            hint="events as they happen"
            action={
              <button
                onClick={() => onNavigate("activity")}
                className="text-[12px] font-semibold text-primary transition-opacity hover:opacity-75"
              >
                Full log →
              </button>
            }
          />
          <Timeline events={activity.slice(0, 7)} compact />
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel className="anim-rise" style={{ "--i": 2 } as React.CSSProperties}>
            <PanelHead title="Quick actions" />
            <div className="flex flex-col p-2">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => onQuickAction(a.label)}
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] font-semibold transition-colors duration-150 hover:bg-accent focus-visible:outline-ring"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors group-hover:border-ink group-hover:text-foreground">
                    <a.icon className="size-4" aria-hidden="true" />
                  </span>
                  {a.label}
                  <ArrowRightIcon
                    className="ml-auto size-3.5 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="anim-rise" style={{ "--i": 3 } as React.CSSProperties}>
            <PanelHead
              title="Bot status"
              action={
                <span
                  className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em]"
                  style={{ color: "var(--ok)" }}
                >
                  <span className="vl-dot vl-dot--live" style={{ background: "var(--ok)", color: "var(--ok)" }} />
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
      </div>
    </div>
  );
}

/* ------------------------------- Timeline -------------------------------- */

const ACTIVITY_META: Record<
  ActivityType,
  { icon: typeof UserPlusIcon; colorVar: string; label: string }
> = {
  join: { icon: UserPlusIcon, colorVar: "--ok", label: "Join" },
  leave: { icon: UserMinusIcon, colorVar: "--chart-5", label: "Leave" },
  command: { icon: ZapIcon, colorVar: "--chart-2", label: "Command" },
  moderation: { icon: GavelIcon, colorVar: "--chart-3", label: "Mod action" },
  alert: { icon: ShieldAlertIcon, colorVar: "--chart-4", label: "Alert" },
  update: { icon: WrenchIcon, colorVar: "--chart-1", label: "Update" },
};

function timeAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Vertical timeline with a continuous rail — replaces the old list rows.
 */
function Timeline({ events, compact = false }: { events: ActivityEvent[]; compact?: boolean }) {
  return (
    <ol className={cn("relative", compact ? "px-5 py-3" : "px-6 py-4")}>
      <span
        aria-hidden="true"
        className="absolute bottom-4 left-[26px] top-4 w-px bg-border"
      />
      {events.map((event, index) => {
        const meta = ACTIVITY_META[event.type];
        return (
          <li
            key={event.id}
            className="anim-rise relative flex items-baseline gap-3 py-2.5 pl-8"
            style={{ "--i": index } as React.CSSProperties}
          >
            <span
              aria-hidden="true"
              className="absolute left-0 top-[15px] flex size-[15px] items-center justify-center rounded-full border border-border bg-card"
            >
              <span
                className="size-[5px] rounded-full"
                style={{ background: `var(${meta.colorVar})`, color: `var(${meta.colorVar})` }}
              />
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-snug">
              <span className="font-semibold">{event.actor}</span>
              <span className="text-muted-foreground"> — {event.message}</span>
            </span>
            <span
              className="vl-tag shrink-0"
              style={{ color: `var(${meta.colorVar})`, borderColor: `color-mix(in srgb, var(${meta.colorVar}) 30%, transparent)` }}
            >
              {meta.label}
            </span>
            <span className="hidden w-16 shrink-0 text-right font-mono text-[10.5px] text-muted-foreground sm:block">
              {timeAgo(event.minutesAgo)}
            </span>
          </li>
        );
      })}
      {events.length === 0 && (
        <li className="py-10 text-center font-mono text-[12px] text-muted-foreground">
          Nothing has happened yet.
        </li>
      )}
    </ol>
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
      {/* Segmented control — different placement/shape from the masthead tabs */}
      <div className="anim-rise flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
        {types.map((t) => {
          const meta = t === "all" ? null : ACTIVITY_META[t];
          const active = filter === t;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              aria-pressed={active}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition-all duration-150 focus-visible:outline-ring",
                active
                  ? "bg-ink text-paper"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {meta ? (
                <span className="size-1.5 rounded-full" style={{ background: `var(${meta.colorVar})` }} />
              ) : null}
              {t === "all" ? "All" : meta?.label}
              <span className={cn("font-mono text-[10px]", active ? "opacity-70" : "opacity-60")}>
                {countFor(t)}
              </span>
            </button>
          );
        })}
      </div>

      <Panel className="anim-rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
        <PanelHead title="Event timeline" hint={`${shown.length} shown`} />
        <Timeline events={shown} />
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

/**
 * Master-detail: compact module list on the left, full detail panel on the
 * right. Selecting a row swaps the detail with a soft entrance animation.
 */
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
  const [selectedId, setSelectedId] = useState<string | null>(plugins[0]?.id ?? null);
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

  const selected = shown.find((p) => p.id === selectedId) ?? shown[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="anim-rise flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

      <div className="grid items-start gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Master list */}
        <Panel className="anim-rise overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="vl-label">Modules</p>
            <p className="font-mono text-[10.5px] text-muted-foreground/80">
              {plugins.filter((p) => p.enabled).length}/{plugins.length} active
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-border/70">
            {shown.map((plugin, index) => {
              const Icon = CATEGORY_ICON[plugin.category];
              const active = selected?.id === plugin.id;
              return (
                <li key={plugin.id} className="anim-rise" style={{ "--i": index } as React.CSSProperties}>
                  <button
                    onClick={() => setSelectedId(plugin.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-ring",
                      active ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-md border",
                        plugin.enabled
                          ? "border-primary/25 bg-primary/[0.08] text-primary"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold tracking-tight">
                        {plugin.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                        v{plugin.version} · {plugin.category}
                      </span>
                    </span>
                    <span
                      className="vl-dot"
                      style={
                        plugin.enabled
                          ? { background: "var(--ok)", color: "var(--ok)" }
                          : { background: "var(--muted-foreground)" }
                      }
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 py-10">
              <CheckCircle2Icon className="size-5 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-[13px] font-semibold">No plugins match</p>
              <p className="text-[12px] text-muted-foreground">Try a different search or filter.</p>
            </div>
          )}
        </Panel>

        {/* Detail panel */}
        <Panel className="anim-rise overflow-hidden" style={{ "--i": 2 } as React.CSSProperties}>
          {selected ? (
            <div key={selected.id} className="anim-fade">
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center rounded-lg border",
                      selected.enabled
                        ? "border-primary/25 bg-primary/[0.08] text-primary"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {(() => {
                      const Icon = CATEGORY_ICON[selected.category];
                      return <Icon className="size-6" aria-hidden="true" />;
                    })()}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className="text-[18px] font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-grotesk)" }}
                      >
                        {selected.name}
                      </h3>
                      <span className="vl-tag">v{selected.version}</span>
                      <span className="vl-tag">{selected.category}</span>
                    </div>
                    <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground" dir="auto">
                      {selected.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch
                    checked={selected.enabled}
                    onCheckedChange={() => onToggle(selected)}
                    aria-label={`Toggle ${selected.name}`}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: selected.enabled ? "var(--ok)" : "var(--muted-foreground)" }}
                  >
                    {selected.enabled ? "enabled" : "disabled"}
                  </span>
                </div>
              </div>

              <dl className="flex flex-col px-5 py-2">
                {[
                  ["Author", `@${selected.author}`],
                  ["Module id", selected.id],
                  ["Dashboard", selected.dashboard ? "schema-driven studio" : "none"],
                  ["Installs", fmt.format(1200 + selected.name.length * 137)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline border-b border-border/60 py-2.5 last:border-0">
                    <dt className="text-[12.5px] text-muted-foreground">{k}</dt>
                    <dd className="vl-leader" />
                    <dd className="font-mono text-[12px]" dir="auto">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
                {selected.dashboard ? (
                  <button
                    onClick={() => setStudioPlugin(selected)}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-[12.5px] font-semibold text-paper transition-colors duration-150 hover:bg-ink/85 focus-visible:outline-ring"
                    aria-label={`Configure ${selected.name}`}
                  >
                    <Settings2Icon className="size-3.5" aria-hidden="true" />
                    <span dir="auto">افتح الإعدادات</span>
                  </button>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    This module has no dashboard — toggle it and it just runs.
                  </p>
                )}
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground/70">
                  changes apply on save
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16">
              <PuzzleIcon className="size-6 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-[13px] font-semibold">Select a module</p>
              <p className="text-[12px] text-muted-foreground">Pick one from the list to inspect it.</p>
            </div>
          )}
        </Panel>
      </div>

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
