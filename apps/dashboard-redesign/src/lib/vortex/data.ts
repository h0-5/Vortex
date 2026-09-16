/**
 * Vortex dashboard data layer.
 * Mirrors the Phase 1 REST contract (docs/openapi.yaml):
 *   GET /api/v1/me, GET /api/v1/guilds, GET /api/v1/guilds/{guildId}
 * All data is mocked client-side for the redesign preview.
 */

export type GuildRole = "OWNER" | "ADMINISTRATOR" | "MANAGER";

export interface VortexUser {
  id: string;
  username: string;
  globalName: string;
  avatarUrl: string | null;
}

export interface Guild {
  id: string;
  name: string;
  initials: string;
  hue: number;
  memberCount: number;
  onlineCount: number;
  botPresent: boolean;
  role: GuildRole;
}

export type PluginCategory =
  | "Moderation"
  | "Tickets"
  | "Utility"
  | "Analytics"
  | "Security"
  | "Fun";

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: PluginCategory;
  enabled: boolean;
  installs: number;
}

export type ActivityType =
  | "join"
  | "leave"
  | "command"
  | "moderation"
  | "alert"
  | "update";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  actor: string;
  message: string;
  minutesAgo: number;
}

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface LogLine {
  id: number;
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
}

export interface ApiEndpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  status: "operational" | "degraded";
  latencyMs: number;
  uptimePct: number;
}

export const MOCK_USER: VortexUser = {
  id: "1251665502242213979",
  username: "hade",
  globalName: "! 𝓗𝓪𝓭𝓮",
  avatarUrl: null,
};

export const MOCK_GUILDS: Guild[] = [
  { id: "901", name: "Vortex Community", initials: "VC", hue: 265, memberCount: 18420, onlineCount: 3211, botPresent: true, role: "OWNER" },
  { id: "902", name: "Vortex HQ", initials: "VH", hue: 200, memberCount: 7450, onlineCount: 1102, botPresent: true, role: "ADMINISTRATOR" },
  { id: "903", name: "Blade Esports", initials: "BE", hue: 290, memberCount: 12310, onlineCount: 2450, botPresent: true, role: "ADMINISTRATOR" },
  { id: "904", name: "Dev Lounge", initials: "DL", hue: 175, memberCount: 2890, onlineCount: 412, botPresent: false, role: "MANAGER" },
  { id: "905", name: "Aurora Nation", initials: "AN", hue: 320, memberCount: 9600, onlineCount: 1840, botPresent: true, role: "MANAGER" },
  { id: "906", name: "Zero Point", initials: "ZP", hue: 230, memberCount: 540, onlineCount: 96, botPresent: false, role: "MANAGER" },
];

export const MOCK_PLUGINS: Plugin[] = [
  { id: "p1", name: "Sentinel Moderation", description: "Auto-mod with AI spam scoring, raid shield, and appeal flow.", version: "2.4.1", author: "vortex-core", category: "Moderation", enabled: true, installs: 128400 },
  { id: "p2", name: "TicketForge", description: "Multi-panel support tickets with transcripts and SLA timers.", version: "1.9.0", author: "vortex-core", category: "Tickets", enabled: true, installs: 96700 },
  { id: "p3", name: "Pulse Analytics", description: "Member, channel, and engagement analytics with retention curves.", version: "0.8.3", author: "aurora-labs", category: "Analytics", enabled: true, installs: 41250 },
  { id: "p4", name: "GateKeeper Verification", description: "Captcha + alt detection at the door, zero-friction for humans.", version: "3.1.2", author: "blade-sec", category: "Security", enabled: true, installs: 77800 },
  { id: "p5", name: "RoleSync", description: "Bidirectional role sync with Twitch, YouTube, and Patreon.", version: "1.4.7", author: "community", category: "Utility", enabled: false, installs: 33900 },
  { id: "p6", name: "AutoResponder", description: "Keyword-triggered replies with fuzzy matching and cooldowns.", version: "2.0.0", author: "community", category: "Utility", enabled: false, installs: 28100 },
  { id: "p7", name: "RaidShield", description: "Join-burst detection with progressive lockdown modes.", version: "1.2.9", author: "blade-sec", category: "Security", enabled: true, installs: 64200 },
  { id: "p8", name: "Arcade", description: "Trivia, races, and economy games with seasonal leaderboards.", version: "0.6.1", author: "community", category: "Fun", enabled: false, installs: 51600 },
];

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: "a1", type: "alert", actor: "RaidShield", message: "Join-burst flagged in #general — 23 accounts quarantined", minutesAgo: 2 },
  { id: "a2", type: "command", actor: "@kx_raven", message: "/ticket open — billing question resolved in 4m 12s", minutesAgo: 6 },
  { id: "a3", type: "join", actor: "+148 members", message: "New members joined in the last hour (82% above average)", minutesAgo: 14 },
  { id: "a4", type: "moderation", actor: "@nyx.mod", message: "Timeout issued to @spicy_meme_lord — 7 days, spam", minutesAgo: 23 },
  { id: "a5", type: "update", actor: "Sentinel Moderation", message: "Updated to v2.4.1 — appeal flow improvements", minutesAgo: 47 },
  { id: "a6", type: "command", actor: "@luna.exe", message: "/stats export — monthly report generated", minutesAgo: 62 },
  { id: "a7", type: "leave", actor: "-36 members", message: "Members left in the last 24h (within normal range)", minutesAgo: 95 },
  { id: "a8", type: "alert", actor: "GateKeeper", message: "3 alt accounts blocked at verification gate", minutesAgo: 121 },
];

export const MOCK_ENDPOINTS: ApiEndpoint[] = [
  { method: "GET", path: "/api/v1/health", description: "Service health probe", status: "operational", latencyMs: 11, uptimePct: 99.99 },
  { method: "GET", path: "/api/v1/me", description: "Current authenticated user", status: "operational", latencyMs: 24, uptimePct: 99.98 },
  { method: "GET", path: "/api/v1/guilds", description: "Guilds visible to the current user", status: "operational", latencyMs: 38, uptimePct: 99.97 },
  { method: "GET", path: "/api/v1/guilds/{guildId}", description: "Guild context with bot presence", status: "operational", latencyMs: 41, uptimePct: 99.96 },
  { method: "GET", path: "/api/v1/auth/discord", description: "OAuth authorization entry (PKCE + state)", status: "operational", latencyMs: 19, uptimePct: 99.99 },
  { method: "GET", path: "/api/v1/auth/discord/callback", description: "OAuth callback with token exchange", status: "degraded", latencyMs: 133, uptimePct: 99.42 },
  { method: "POST", path: "/api/v1/auth/logout", description: "Session termination + ID rotation", status: "operational", latencyMs: 16, uptimePct: 99.99 },
];

export const SECURITY_FEATURES = [
  { title: "OAuth 2.0 + PKCE", detail: "Authorization code flow with state validation and PKCE verifier." },
  { title: "AES-256-GCM tokens", detail: "Discord access and refresh tokens encrypted at rest." },
  { title: "Opaque HTTP-only sessions", detail: "Server-side PostgreSQL sessions, ID rotation after login." },
  { title: "Same-origin enforcement", detail: "State-changing requests reject cross-site origins." },
];

const LOG_SOURCES = ["gateway", "api", "bot.core", "plugin.sentinel", "plugin.tickets", "scheduler", "oauth"];
const LOG_SAMPLES: Array<{ level: LogLevel; message: string }> = [
  { level: "INFO", message: "Heartbeat ACK received — shard 0 (seq 48291)" },
  { level: "INFO", message: "Guild synced: Vortex Community (18,420 members)" },
  { level: "DEBUG", message: "Cache hit ratio 97.2% — guild member store" },
  { level: "INFO", message: "Session refreshed via refresh-token rotation" },
  { level: "WARN", message: "Rate limit bucket 15s/5 approaching 80% — backing off" },
  { level: "INFO", message: "Ticket #4812 closed — transcript archived to storage" },
  { level: "ERROR", message: "OAuth callback upstream timeout (retry 1/3)" },
  { level: "INFO", message: "Scheduled job: nightly analytics rollup queued" },
  { level: "DEBUG", message: "AES-256-GCM token envelope rewrapped" },
  { level: "WARN", message: "Plugin AutoResponder cooldown triggered on #memes" },
  { level: "INFO", message: "RaidShield quarantine list pruned (23 -> 0 stale)" },
  { level: "DEBUG", message: "WebSocket shard 0 resume OK — replayed 0 events" },
];

export function randomLogLine(id: number): LogLine {
  const sample = LOG_SAMPLES[Math.floor(Math.random() * LOG_SAMPLES.length)];
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  return {
    id,
    ts,
    level: sample.level,
    source: LOG_SOURCES[Math.floor(Math.random() * LOG_SOURCES.length)],
    message: sample.message,
  };
}

export function seedLogs(count: number): LogLine[] {
  let id = 1;
  const out: LogLine[] = [];
  for (let i = 0; i < count; i++) out.push(randomLogLine(id++));
  return out;
}

export const fmt = new Intl.NumberFormat("en-US");
