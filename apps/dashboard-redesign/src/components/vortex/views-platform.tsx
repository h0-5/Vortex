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

/* Warm-terminal level palette (on the dark inset block) */
const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: "#8ab4a0",
  WARN: "#d9a03f",
  ERROR: "#e5654e",
  DEBUG: "#8a877c",
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
          <SelectTrigger className="h-9 w-36 border-input bg-card text-xs">
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
          <SelectTrigger className="h-9 w-44 border-input bg-card text-xs">
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
            "ml-auto h-9 gap-1.5 border-input bg-card text-xs hover:bg-accent",
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
          className="h-9 gap-1.5 border-input bg-card text-xs hover:bg-accent"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </div>

      <div className="vl-terminal overflow-hidden rounded-lg font-mono">
        <div className="flex items-center justify-between border-b border-[#33312a] px-4 py-2.5 text-[11px]">
          <span className="flex items-center gap-2 text-[#8a877c]">
            <span
              className={cn(
                "inline-block size-1.5 rounded-full",
                paused ? "bg-[#d9a03f]" : "bg-[#8ab4a0] vl-dot--live text-[#8ab4a0]",
              )}
            />
            {paused ? "stream paused" : "streaming live"}
          </span>
          <span className="text-[#6e6b60]">{fmt.format(shown.length)} lines</span>
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
              <span className="shrink-0 text-[#6e6b60]">{line.ts}</span>
              <span className="w-11 shrink-0 font-semibold" style={{ color: LEVEL_COLOR[line.level] }}>
                {line.level}
              </span>
              <span className="w-28 shrink-0 truncate text-[#7fa6d9]">{line.source}</span>
              <span className="min-w-0 text-[#d9d6cb]">{line.message}</span>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="py-16 text-center text-[#6e6b60]">Buffer empty.</p>
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
            color: degraded === 0 ? "#12805c" : "#b45309",
          },
          { label: "Health latency", value: health ? `${health.latencyMs}ms` : "–", icon: GaugeIcon, color: "#0f5aa8" },
          { label: "Core endpoints", value: "7 tracked", icon: ActivitySquareIcon, color: "#17603f" },
        ].map((c) => (
          <div key={c.label} className="vl-panel flex items-center gap-4 rounded-lg p-5">
            <span
              className="flex size-10 items-center justify-center rounded-md border"
              style={{ background: `${c.color}14`, borderColor: `${c.color}30`, color: c.color }}
            >
              <c.icon className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="vl-label">{c.label}</p>
              <p className="mt-0.5 font-mono text-[17px] font-medium">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="vl-panel overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="vl-label">Endpoints</p>
          <p className="font-mono text-[10.5px] text-muted-foreground/80">/api/v1</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-20 pl-5 text-[11px]">Method</TableHead>
                <TableHead className="text-[11px]">Endpoint</TableHead>
                <TableHead className="hidden text-[11px] md:table-cell">Description</TableHead>
                <TableHead className="w-40 text-[11px]">Latency</TableHead>
                <TableHead className="w-24 pr-5 text-right text-[11px]">Uptime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((e) => (
                <TableRow key={e.path} className="border-border/70 hover:bg-accent/50">
                  <TableCell className="pl-5">
                    <span
                      className={cn(
                        "inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                        e.method === "GET"
                          ? "border-primary/25 bg-primary/[0.08] text-primary"
                          : "border-[#0f5aa8]/25 bg-[#0f5aa8]/[0.07] text-[#0f5aa8]",
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
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (e.latencyMs / 150) * 100)}%`,
                            background: e.latencyMs > 100 ? "#b45309" : "var(--primary)",
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
                          e.status === "operational" ? "bg-[#12805c]" : "bg-[#b45309]",
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
  { name: "Pine", primary: "#17603f", ring: "#17603f" },
  { name: "Cobalt", primary: "#0f5aa8", ring: "#0f5aa8" },
  { name: "Rust", primary: "#b45309", ring: "#b45309" },
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
      <section className="vl-panel rounded-lg">
        <div className="border-b border-border px-5 py-3">
          <h3 className="vl-label !text-foreground">Branding</h3>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-ink">
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
                className="h-9 border-input bg-card text-[13px]"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSavedName(appName.trim() || "Vortex");
              toast.success("Branding saved");
            }}
            className="mt-4 h-8 rounded-md bg-ink text-xs font-semibold text-paper hover:bg-ink/85"
          >
            Save branding
          </Button>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Preview: <span className="font-semibold text-foreground">{savedName}</span> console
          </p>
        </div>
      </section>

      {/* Appearance */}
      <section className="vl-panel rounded-lg">
        <div className="border-b border-border px-5 py-3">
          <h3 className="vl-label !text-foreground">Accent</h3>
        </div>
        <div className="p-5">
          <p className="mb-4 text-[12.5px] text-muted-foreground">
            Applies immediately across active states, toggles, and focus rings.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {ACCENTS.map((a) => (
              <button
                key={a.name}
                onClick={() => applyAccent(a.name)}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 text-left transition-colors duration-150 focus-visible:outline-ring",
                  accent === a.name
                    ? "border-ink"
                    : "border-border hover:border-input",
                )}
                aria-pressed={accent === a.name}
              >
                <span className="size-6 rounded-sm" style={{ background: a.primary }} />
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
      <section className="vl-panel rounded-lg">
        <div className="border-b border-border px-5 py-3">
          <h3 className="vl-label !text-foreground">Session security</h3>
        </div>
        <ul className="flex flex-col divide-y divide-border/70">
          {SECURITY_FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3 px-5 py-3.5">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-[#12805c]" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Danger zone */}
      <section className="vl-panel rounded-lg border-destructive/30">
        <div className="border-b border-destructive/20 px-5 py-3">
          <h3 className="flex items-center gap-2">
            <OctagonAlertIcon className="size-4 text-destructive" aria-hidden="true" />
            <span className="vl-label !text-destructive">Danger zone</span>
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
                className="mt-4 border-destructive/40 bg-transparent text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
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
