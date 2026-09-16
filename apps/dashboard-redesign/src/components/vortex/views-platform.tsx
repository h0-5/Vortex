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
import { Badge } from "@/components/ui/badge";
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

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: "#22d3ee",
  WARN: "#fbbf24",
  ERROR: "#f87171",
  DEBUG: "#8b8b9e",
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
          <SelectTrigger className="h-9 w-36 border-border/70 bg-white/[0.02] text-xs">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover">
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="DEBUG">DEBUG</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="h-9 w-44 border-border/70 bg-white/[0.02] text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover">
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
            "ml-auto gap-1.5 border-border bg-transparent text-xs hover:bg-white/5",
            paused && "border-primary/50 text-primary",
          )}
        >
          {paused ? <PlayIcon className="size-3.5" /> : <PauseIcon className="size-3.5" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLogs([])}
          className="gap-1.5 border-border bg-transparent text-xs hover:bg-white/5"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </div>

      <div className="nx-gradient-border overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border/60 bg-white/[0.02] px-4 py-2.5">
          <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className={cn("inline-block size-1.5 rounded-full", paused ? "bg-[#fbbf24]" : "nx-live-dot bg-[#34d399] text-[#34d399]")} />
            {paused ? "stream paused" : "streaming live"}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground/70">
            {fmt.format(shown.length)} lines
          </span>
        </div>
        <div
          ref={scrollRef}
          className="h-[480px] overflow-y-auto bg-black/60 p-4 font-mono text-[12px] leading-[1.75]"
          role="log"
          aria-live="off"
          aria-label="Platform logs"
        >
          {shown.map((line) => (
            <div key={line.id} className="flex gap-3 whitespace-pre-wrap break-all">
              <span className="shrink-0 text-muted-foreground/50">{line.ts}</span>
              <span className="w-11 shrink-0 font-bold" style={{ color: LEVEL_COLOR[line.level] }}>
                {line.level}
              </span>
              <span className="w-28 shrink-0 truncate text-[#818cf8]">{line.source}</span>
              <span className="min-w-0 text-foreground/85">{line.message}</span>
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
            color: degraded === 0 ? "#34d399" : "#fbbf24",
          },
          { label: "Health latency", value: health ? `${health.latencyMs}ms` : "–", icon: GaugeIcon, color: "#22d3ee" },
          { label: "Core endpoints", value: "7 tracked", icon: ActivitySquareIcon, color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.label} className="nx-panel flex items-center gap-4 rounded-xl p-5">
            <span
              className="flex size-10 items-center justify-center rounded-lg"
              style={{ background: `${c.color}1f`, color: c.color }}
            >
              <c.icon className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="nx-panel overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-20 pl-5 text-xs">Method</TableHead>
                <TableHead className="text-xs">Endpoint</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Description</TableHead>
                <TableHead className="w-40 text-xs">Latency</TableHead>
                <TableHead className="w-24 pr-5 text-right text-xs">Uptime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((e) => (
                <TableRow key={e.path} className="border-border/40 hover:bg-white/[0.02]">
                  <TableCell className="pl-5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent font-mono text-[10px] font-bold",
                        e.method === "GET" ? "bg-[#8b5cf6]/15 text-[#a78bfa]" : "bg-[#06b6d4]/15 text-[#22d3ee]",
                      )}
                    >
                      {e.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.path}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {e.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (e.latencyMs / 150) * 100)}%`,
                            background: e.latencyMs > 100 ? "#fbbf24" : "linear-gradient(90deg, #8b5cf6, #06b6d4)",
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
                          e.status === "operational" ? "bg-[#34d399]" : "bg-[#fbbf24]",
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
  { name: "Vortex Violet", primary: "#8b5cf6", ring: "#8b5cf6" },
  { name: "Blade Cyan", primary: "#06b6d4", ring: "#06b6d4" },
  { name: "Singularity Indigo", primary: "#6366f1", ring: "#6366f1" },
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
    }
    toast.success(`Accent set to ${name}`);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* Branding */}
      <section className="nx-panel rounded-xl p-5">
        <h3 className="text-sm font-bold tracking-tight">Branding</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Name and mark shown across the dashboard and bot identity.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <VortexMark size={56} className="nx-glow-soft rounded-xl" />
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="app-name">
              Application name
            </label>
            <Input
              id="app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="h-9 border-border/70 bg-white/[0.02] text-[13px]"
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setSavedName(appName.trim() || "Vortex");
            toast.success("Branding saved");
          }}
          className="nx-gradient nx-glow mt-4 rounded-md text-xs font-bold text-white hover:opacity-90"
        >
          Save branding
        </Button>
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          Preview: <span className="font-semibold text-foreground">{savedName}</span> dashboard
        </p>
      </section>

      {/* Appearance */}
      <section className="nx-panel rounded-xl p-5">
        <h3 className="text-sm font-bold tracking-tight">Appearance</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          OLED black canvas with a selectable brand accent.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {ACCENTS.map((a) => (
            <button
              key={a.name}
              onClick={() => applyAccent(a.name)}
              className={cn(
                "flex flex-col items-start gap-3 rounded-lg border p-3.5 text-left transition-all duration-150 focus-visible:outline-ring",
                accent === a.name
                  ? "border-primary/60 bg-primary/[0.08]"
                  : "border-border/70 hover:border-border",
              )}
              aria-pressed={accent === a.name}
            >
              <span
                className="size-7 rounded-md"
                style={{ background: a.primary, boxShadow: `0 0 16px -4px ${a.primary}` }}
              />
              <span className="text-xs font-semibold">{a.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="nx-panel rounded-xl p-5">
        <h3 className="text-sm font-bold tracking-tight">Session security</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Enforced by the platform core — not configurable per guild.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {SECURITY_FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-[#34d399]" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Danger zone */}
      <section className="nx-panel rounded-xl border-destructive/25 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <OctagonAlertIcon className="size-4 text-destructive" aria-hidden="true" />
          Danger zone
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Revoking the session rotates the session ID server-side and clears the opaque cookie.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-4 border-destructive/40 bg-transparent text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Revoke session & log out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-border bg-popover">
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be returned to the login screen and all dashboard state will be cleared.
                Discord tokens remain encrypted at rest and are rotated on next login.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border bg-transparent hover:bg-white/5">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onLogout}
                className="bg-destructive text-white hover:bg-destructive/85"
              >
                Revoke session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
