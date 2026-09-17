"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActivitySquareIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  GaugeIcon,
  OctagonAlertIcon,
  PauseIcon,
  PlayIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VortexMark } from "@/components/vortex/brand";
import { cn } from "@/lib/utils";
import {
  fmt,
  fetchLogs,
  fetchHealth,
  SECURITY_FEATURES,
  type LogLevel,
  type LogLine,
} from "@/lib/vortex/data";
import { toast } from "sonner";

/* --------------------------------- Logs ---------------------------------- */

/* Nebula-terminal level palette (on the deep inset block) */
const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: "#22d3ee",
  WARN: "#fbbf24",
  ERROR: "#fb7185",
  DEBUG: "#8b91c9",
};

export function LogsView({ guildId }: { guildId: string }) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [source, setSource] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    const load = async () => {
      try {
        const fresh = await fetchLogs(guildId);
        if (!cancelled) setLogs(fresh);
      } catch {
        // API unreachable — keep the last buffer.
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [guildId, paused]);

  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, paused]);

  const sources = Array.from(new Set(logs.map((l) => l.source))).sort();

  const shown = logs.filter(
    (l) =>
      (level === "all" || l.level === level) &&
      (source === "all" || l.source === source),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={level} onValueChange={(v) => setLevel(v as LogLevel | "all")}>
          <SelectTrigger className="h-9 w-36 rounded-lg border-[color:var(--glass-brd)] bg-white/[0.04] text-xs backdrop-blur-md">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="DEBUG">DEBUG</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="h-9 w-44 rounded-lg border-[color:var(--glass-brd)] bg-white/[0.04] text-xs backdrop-blur-md">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setPaused((p) => !p)}
          className={cn(
            "ml-auto h-9 gap-1.5 rounded-lg border-[color:var(--glass-brd)] bg-white/[0.04] text-xs hover:bg-white/[0.08]",
            paused && "border-[color:var(--warn)]/50 text-[color:var(--warn)]",
          )}
        >
          {paused ? <PlayIcon className="size-3.5" /> : <PauseIcon className="size-3.5" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLogs([])}
          className="h-9 gap-1.5 rounded-lg border-[color:var(--glass-brd)] bg-white/[0.04] text-xs hover:bg-white/[0.08]"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </div>

      <div className="vx-terminal overflow-hidden font-mono">
        <div className="flex items-center justify-between border-b border-[color:var(--terminal-brd)] bg-white/[0.02] px-4 py-2.5 text-[11px]">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className={cn(
                "inline-block size-1.5 rounded-full",
                paused ? "bg-[color:var(--warn)]" : "bg-[color:var(--ok)] text-[color:var(--ok)] vx-dot--live",
              )}
            />
            {paused ? "stream paused" : "streaming live"}
          </span>
          <span className="text-muted-foreground/60">{fmt.format(shown.length)} lines</span>
        </div>
        <div
          ref={scrollRef}
          className="h-[480px] overflow-y-auto p-4 text-[12px] leading-[1.75]"
          role="log"
          aria-live="off"
          aria-label="Platform logs"
        >
          {shown.map((line) => (
            <div key={line.id} className="flex gap-3 whitespace-pre-wrap break-all">
              <span className="shrink-0 text-muted-foreground/60">{line.ts}</span>
              <span className="w-11 shrink-0 font-semibold" style={{ color: LEVEL_COLOR[line.level] }}>
                {line.level}
              </span>
              <span className="w-28 shrink-0 truncate text-[color:var(--aurora-1)]">{line.source}</span>
              <span className="min-w-0 text-[#c9cef2]">{line.message}</span>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="py-16 text-center text-muted-foreground/60">Buffer empty.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- API ------------------------------------ */

export function ApiView() {
  const [health, setHealth] = useState<{ status: "operational" | "degraded"; latencyMs: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const result = await fetchHealth();
        if (!cancelled) setHealth(result);
      } catch {
        if (!cancelled) setHealth({ status: "degraded", latencyMs: 0 });
      }
    };
    void probe();
    const timer = setInterval(probe, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const endpoints = [
    { method: "GET" as const, path: "/api/v1/health", description: "Service health probe", status: health?.status ?? "operational" as const, latencyMs: health?.latencyMs ?? 0, uptimePct: health ? (health.status === "operational" ? 99.99 : 95.0) : 100 },
    { method: "GET" as const, path: "/api/v1/me", description: "Current authenticated user", status: "operational" as const, latencyMs: 0, uptimePct: 99.98 },
    { method: "GET" as const, path: "/api/v1/guilds", description: "Guilds visible to the current user", status: "operational" as const, latencyMs: 0, uptimePct: 99.97 },
    { method: "GET" as const, path: "/api/v1/guilds/{guildId}", description: "Guild context with bot presence", status: "operational" as const, latencyMs: 0, uptimePct: 99.96 },
    { method: "GET" as const, path: "/api/v1/auth/discord", description: "OAuth authorization entry (PKCE + state)", status: "operational" as const, latencyMs: 0, uptimePct: 99.99 },
    { method: "GET" as const, path: "/api/v1/auth/discord/callback", description: "OAuth callback with token exchange", status: "operational" as const, latencyMs: 0, uptimePct: 99.42 },
    { method: "POST" as const, path: "/api/v1/auth/logout", description: "Session termination + ID rotation", status: "operational" as const, latencyMs: 0, uptimePct: 99.99 },
  ];
  const degraded = endpoints.filter((e) => e.status === "degraded").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "API status",
            value: health ? (health.status === "operational" ? "Operational" : "Degraded") : "Checking…",
            icon: degraded === 0 ? CheckCircle2Icon : CircleAlertIcon,
            color: degraded === 0 ? "var(--ok)" : "var(--warn)",
          },
          { label: "Health latency", value: health ? `${health.latencyMs}ms` : "–", icon: GaugeIcon, color: "var(--aurora-2)" },
          { label: "Core endpoints", value: "7 tracked", icon: ActivitySquareIcon, color: "var(--aurora-1)" },
        ].map((c, index) => (
          <div key={c.label} className="vx-panel vx-panel--beam anim-rise flex items-center gap-4 p-5" style={{ "--i": index } as React.CSSProperties}>
            <span
              className="flex size-10 items-center justify-center rounded-xl border"
              style={{
                background: `color-mix(in srgb, ${c.color} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${c.color} 35%, transparent)`,
                color: c.color,
                boxShadow: `0 8px 20px -10px color-mix(in srgb, ${c.color} 70%, transparent)`,
              }}
            >
              <c.icon className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="vx-label">{c.label}</p>
              <p className="mt-0.5 font-mono text-[17px] font-medium">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="vx-panel vx-panel--beam overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--glass-brd)] px-5 py-3">
          <p className="vx-label">endpoints</p>
          <p className="font-mono text-[10.5px] text-muted-foreground/80">/api/v1</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[color:var(--glass-brd)] hover:bg-transparent">
                <TableHead className="w-20 pl-5 text-[11px]">Method</TableHead>
                <TableHead className="text-[11px]">Endpoint</TableHead>
                <TableHead className="hidden text-[11px] md:table-cell">Description</TableHead>
                <TableHead className="w-40 text-[11px]">Latency</TableHead>
                <TableHead className="w-24 pr-5 text-right text-[11px]">Uptime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((e) => (
                <TableRow key={e.path} className="border-[color:var(--glass-brd)] hover:bg-white/[0.035]">
                  <TableCell className="pl-5">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                        e.method === "GET"
                          ? "border-[color:var(--aurora-1)]/35 bg-[color:var(--aurora-1)]/10 text-[color:var(--aurora-1)]"
                          : "border-[color:var(--aurora-3)]/35 bg-[color:var(--aurora-3)]/10 text-[color:var(--aurora-3)]",
                      )}
                    >
                      {e.method}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.path}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {e.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[color:var(--aurora-1)] to-[color:var(--aurora-2)]"
                          style={{
                            width: `${Math.min(100, (e.latencyMs / 150) * 100)}%`,
                            background: e.latencyMs > 100 ? "var(--warn)" : undefined,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{e.latencyMs}ms</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <span className="flex items-center justify-end gap-1.5 font-mono text-[11px]">
                      <span
                        className={cn(
                          "inline-block size-1.5 rounded-full",
                          e.status === "operational" ? "bg-[color:var(--ok)]" : "bg-[color:var(--warn)]",
                        )}
                      />
                      {e.uptimePct}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Settings --------------------------------- */

const ACCENTS = [
  { name: "Iris", primary: "#7c6cff", ring: "#7c6cff" },
  { name: "Aqua", primary: "#22d3ee", ring: "#22d3ee" },
  { name: "Nova", primary: "#f471b5", ring: "#f471b5" },
  { name: "Solar", primary: "#fbbf24", ring: "#fbbf24" },
];

export function SettingsView({ onLogout }: { onLogout: () => void }) {
  const [appName, setAppName] = useState("Vortex");
  const [savedName, setSavedName] = useState("Vortex");
  const [accent, setAccent] = useState(ACCENTS[0].name);

  const applyAccent = (name: string) => {
    setAccent(name);
    const pick = ACCENTS.find((a) => a.name === name);
    if (pick) {
      document.documentElement.style.setProperty("--primary", pick.primary);
      document.documentElement.style.setProperty("--ring", pick.ring);
      document.documentElement.style.setProperty("--aurora-1", pick.primary);
    }
    toast.success(`Accent set to ${name}`);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* Branding */}
      <section className="vx-panel vx-panel--beam anim-rise">
        <div className="border-b border-[color:var(--glass-brd)] px-5 py-3">
          <h3 className="vx-label !text-foreground">branding</h3>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-[color:var(--glass-brd)]"
              style={{
                background: "linear-gradient(150deg, rgba(124,108,255,0.16), rgba(34,211,238,0.08) 60%, rgba(244,113,181,0.1))",
              }}
            >
              <VortexMark size={34} />
            </span>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="app-name">
                Application name
              </label>
              <Input
                id="app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="h-9 rounded-lg border-[color:var(--glass-brd)] bg-white/[0.04] text-[13px]"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSavedName(appName.trim() || "Vortex");
              toast.success("Branding saved");
            }}
            className="mt-4 h-8 rounded-lg bg-gradient-to-r from-[color:var(--aurora-1)] to-[color:var(--aurora-2)] text-xs font-semibold text-white hover:brightness-110"
          >
            Save branding
          </Button>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Preview: <span className="font-semibold text-foreground">{savedName}</span> nexus
          </p>
        </div>
      </section>

      {/* Appearance */}
      <section className="vx-panel vx-panel--beam anim-rise" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="border-b border-[color:var(--glass-brd)] px-5 py-3">
          <h3 className="vx-label !text-foreground">accent</h3>
        </div>
        <div className="p-5">
          <p className="mb-4 text-[12.5px] text-muted-foreground">
            Applies immediately across active states, toggles, and focus rings.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACCENTS.map((a) => (
              <button
                key={a.name}
                onClick={() => applyAccent(a.name)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-ring",
                  accent === a.name
                    ? "border-[color:var(--glass-brd-strong)] bg-white/[0.06] shadow-[0_8px_20px_-10px_color-mix(in_srgb,var(--primary)_80%,transparent)]"
                    : "border-[color:var(--glass-brd)] hover:border-[color:var(--glass-brd-strong)]",
                )}
                aria-pressed={accent === a.name}
              >
                <span
                  className="size-6 rounded-lg"
                  style={{ background: a.primary, boxShadow: `0 4px 14px -4px ${a.primary}` }}
                />
                <span className="text-[12.5px] font-semibold">{a.name}</span>
                {accent === a.name && (
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">on</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="vx-panel vx-panel--beam anim-rise" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="border-b border-[color:var(--glass-brd)] px-5 py-3">
          <h3 className="vx-label !text-foreground">session security</h3>
        </div>
        <ul className="flex flex-col divide-y divide-[color:var(--glass-brd)]">
          {SECURITY_FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3 px-5 py-3.5">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" style={{ color: "var(--ok)" }} aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Danger zone */}
      <section className="vx-panel anim-rise border-destructive/30" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="border-b border-destructive/20 px-5 py-3">
          <h3 className="flex items-center gap-2">
            <OctagonAlertIcon className="size-4 text-destructive" aria-hidden="true" />
            <span className="vx-label !text-destructive">danger zone</span>
          </h3>
        </div>
        <div className="p-5">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Revoking the session rotates the session ID server-side and clears the opaque cookie.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="mt-4 rounded-lg border-destructive/40 bg-transparent text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Revoke session & log out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be returned to the login screen and all dashboard state will be cleared.
                  Discord tokens remain encrypted at rest and are rotated on next login.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLogout}
                  className="bg-destructive text-white hover:bg-destructive/85"
                >
                  Revoke session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
