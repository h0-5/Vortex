/**
 * Vortex dashboard data layer.
 * Consumes the real Vortex REST contract (API v1) behind the Next.js rewrite:
 *   GET  /api/v1/me, GET /api/v1/guilds
 *   GET  /api/v1/guilds/{guildId}/plugins, POST .../{pluginId}/enable|disable
 *   GET  /api/v1/activity?guildId=..., GET /api/v1/guilds/{guildId}/logs
 *   POST /api/v1/auth/logout, GET /api/v1/health
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
  iconUrl: string | null;
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
  dashboard: { enabled: boolean; label: string } | null;
}

/* --------------------- plugin dashboard schema types ---------------------- */

export type DashboardFieldType =
  | "switch"
  | "channel_select"
  | "category_select"
  | "role_select"
  | "select"
  | "text"
  | "number"
  | "message_composer"
  | "template_select";

export interface DashboardField {
  id: string;
  type: DashboardFieldType;
  label: string;
  description?: string;
  storageKey: string;
  path: string;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>;
  contentModes?: Array<"text" | "embed" | "components_v2">;
  templateType?: string;
  placeholder?: string;
  multiline?: boolean;
}

export type DashboardActionType = "save_storage" | "save_template" | "test_template" | "reset";

export interface DashboardAction {
  id: string;
  type: DashboardActionType;
  label: string;
  storageKeys?: string[];
  templateNamePath?: string;
  templateContentPath?: string;
  templateType?: string;
  templateContentModePath?: string;
  channelIdPath?: string;
}

export interface DashboardSection {
  id: string;
  title: string;
  description?: string;
  fields: DashboardField[];
  actions: DashboardAction[];
}

export interface DashboardTab {
  id: string;
  label: string;
  description?: string;
  sections: DashboardSection[];
}

export interface DashboardSchemaDoc {
  version: 1;
  tabs: DashboardTab[];
  defaults: Record<string, unknown>;
  previewVariables: Record<string, string>;
  defaultMessages: Record<string, unknown>;
}

export interface PluginDashboardContent {
  mode: "schema" | "bundle" | "none";
  schema: DashboardSchemaDoc | null;
  bundleUrl: string | null;
  errors: string[];
}

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
}

export interface GuildRoleOption {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

export interface PluginTemplate {
  id: string;
  name: string;
  type: string;
  contentMode: string;
  content: unknown;
  version: number;
  updatedAt: string;
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
  id: string;
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
}

/* ------------------------- real API response types ------------------------ */

interface ApiUser {
  id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiGuild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number | null;
  canManage: boolean;
  isOwner: boolean;
  hasAdmin: boolean;
  hasManager: boolean;
  botConnected: boolean;
  action: string | null;
  permissionRole: string | null;
}

interface ApiPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: string;
  brokenReason: string | null;
  enabled: boolean;
  guildStatus: string;
  installedAt: string | null;
  updatedAt: string;
  dashboard: PluginManifestDashboard | null;
}

interface PluginManifestDashboard {
  enabled: boolean;
  route: string;
  label: string;
  icon: string;
  tabs: string[];
}

interface ApiLog {
  id: string;
  guildId: string;
  pluginId: string | null;
  level: string;
  message: string;
  metadata: unknown;
  destination: string | null;
  createdAt: string;
}

interface ApiActivity {
  id: string;
  actorId: string;
  actorName: string;
  guildId: string | null;
  pluginId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  type: string;
  message: string;
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (response.status === 204) {
    return undefined as T;
  }
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  return (await response.json()) as T;
}

/* -------------------------------- mappers --------------------------------- */

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/);
  const initials = (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
  return initials.toUpperCase() || "?";
}

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(31, hash) + id.charCodeAt(i);
  }
  return Math.abs(hash) % 360;
}

function mapRole(permissionRole: string | null, guild: ApiGuild): GuildRole {
  if (permissionRole === "OWNER" || permissionRole === "ADMINISTRATOR" || permissionRole === "MANAGER") {
    return permissionRole;
  }
  if (guild.isOwner) return "OWNER";
  if (guild.hasAdmin) return "ADMINISTRATOR";
  return "MANAGER";
}

function categoryForPlugin(plugin: ApiPlugin): PluginCategory {
  const haystack = `${plugin.id} ${plugin.name}`.toLowerCase();
  if (haystack.includes("ticket")) return "Tickets";
  if (haystack.includes("mod") || haystack.includes("moderation")) return "Moderation";
  if (haystack.includes("sec") || haystack.includes("shield") || haystack.includes("gate")
    || haystack.includes("verify")) return "Security";
  if (haystack.includes("analytic") || haystack.includes("stat") || haystack.includes("metric")) return "Analytics";
  if (haystack.includes("game") || haystack.includes("fun") || haystack.includes("arcade")) return "Fun";
  return "Utility";
}

function mapActivityType(event: ApiActivity): ActivityType {
  const haystack = `${event.type} ${event.action} ${event.resourceType}`.toLowerCase();
  if (haystack.includes("join") || haystack.includes("member_add")) return "join";
  if (haystack.includes("leave") || haystack.includes("member_remove") || haystack.includes("kick")) return "leave";
  if (haystack.includes("command") || haystack.includes("slash")) return "command";
  if (haystack.includes("warn") || haystack.includes("mute") || haystack.includes("ban")
    || haystack.includes("timeout") || haystack.includes("mod")) return "moderation";
  if (haystack.includes("alert") || haystack.includes("raid") || haystack.includes("spam")
    || haystack.includes("block") || haystack.includes("quarant")) return "alert";
  return "update";
}

function timeOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toTimeString().slice(0, 8);
}

function minutesSince(iso: string): number {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

function mapLevel(level: string): LogLevel {
  if (level === "INFO" || level === "WARN" || level === "ERROR" || level === "DEBUG") return level;
  if (level === "AUDIT") return "DEBUG";
  return "INFO";
}

/* --------------------------- discord CDN helpers -------------------------- */

function discordAvatarUrl(discordId: string, avatar: string | null): string | null {
  if (!avatar) return null;
  const ext = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=128`;
}

function discordIconUrl(guildId: string, icon: string | null): string | null {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=128`;
}

function mapUser(user: ApiUser): VortexUser {
  return {
    id: user.discordId,
    username: user.username,
    globalName: user.globalName ?? user.username,
    avatarUrl: discordAvatarUrl(user.discordId, user.avatar),
  };
}

function mapGuild(guild: ApiGuild): Guild {
  return {
    id: guild.id,
    name: guild.name,
    initials: initialsFromName(guild.name),
    hue: hueFromId(guild.id),
    iconUrl: discordIconUrl(guild.id, guild.icon),
    memberCount: guild.memberCount ?? 0,
    onlineCount: 0,
    botPresent: guild.botConnected,
    role: mapRole(guild.permissionRole, guild),
  };
}

function mapPlugin(plugin: ApiPlugin): Plugin {
  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    author: plugin.author || "vortex-core",
    category: categoryForPlugin(plugin),
    enabled: Boolean(plugin.enabled),
    installs: 0,
    dashboard:
      plugin.dashboard && plugin.dashboard.enabled
        ? { enabled: true, label: plugin.dashboard.label }
        : null,
  };
}

function mapActivity(event: ApiActivity): ActivityEvent {
  return {
    id: event.id,
    type: mapActivityType(event),
    actor: event.actorName,
    message: event.message,
    minutesAgo: minutesSince(event.createdAt),
  };
}

function mapLog(log: ApiLog): LogLine {
  return {
    id: log.id,
    ts: timeOnly(log.createdAt),
    level: mapLevel(log.level),
    source: log.destination ?? log.pluginId ?? "bot",
    message: log.message,
  };
}

/* ------------------------------- API calls -------------------------------- */

export async function fetchMe(): Promise<VortexUser | null> {
  try {
    return mapUser(await apiFetch<ApiUser>("/api/v1/me"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function fetchGuilds(): Promise<Guild[]> {
  const response = await apiFetch<{ data: ApiGuild[] }>("/api/v1/guilds");
  return (response.data ?? []).map(mapGuild);
}

export async function fetchPlugins(guildId: string): Promise<Plugin[]> {
  const response = await apiFetch<{ data: ApiPlugin[] }>(
    `/api/v1/guilds/${guildId}/plugins`,
  );
  return (response.data ?? []).map(mapPlugin);
}

export async function fetchActivity(guildId: string): Promise<ActivityEvent[]> {
  const response = await apiFetch<{ data: ApiActivity[] }>(
    `/api/v1/activity?guildId=${encodeURIComponent(guildId)}&limit=20`,
  );
  return (response.data ?? []).map(mapActivity);
}

export async function fetchLogs(guildId: string): Promise<LogLine[]> {
  const response = await apiFetch<{ data: ApiLog[] }>(
    `/api/v1/guilds/${guildId}/logs`,
  );
  return (response.data ?? []).map(mapLog).slice(-220);
}

export async function setPluginEnabled(
  guildId: string,
  pluginId: string,
  enabled: boolean,
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/guilds/${guildId}/plugins/${pluginId}/${enabled ? "enable" : "disable"}`,
    { method: "POST" },
  );
}

/* ------------------------- plugin studio API calls ------------------------ */

export async function fetchPluginDashboardContent(
  guildId: string,
  pluginId: string,
): Promise<PluginDashboardContent> {
  const detail = await apiFetch<{
    dashboardContent?: {
      mode: "schema" | "bundle" | "none";
      schema: DashboardSchemaDoc | null;
      bundleUrl: string | null;
      errors?: string[];
    };
  }>(`/api/v1/guilds/${guildId}/plugins/${pluginId}`);
  const content = detail.dashboardContent;
  if (!content) return { mode: "none", schema: null, bundleUrl: null, errors: [] };
  return {
    mode: content.mode,
    schema: content.schema,
    bundleUrl: content.bundleUrl,
    errors: content.errors ?? [],
  };
}

export async function fetchGuildChannels(guildId: string): Promise<GuildChannel[]> {
  const response = await apiFetch<{ data: GuildChannel[] }>(
    `/api/v1/guilds/${guildId}/channels`,
  );
  return response.data ?? [];
}

export async function fetchGuildCategories(guildId: string): Promise<GuildChannel[]> {
  const response = await apiFetch<{ data: GuildChannel[] }>(
    `/api/v1/guilds/${guildId}/categories`,
  );
  return response.data ?? [];
}

export async function fetchGuildRoles(guildId: string): Promise<GuildRoleOption[]> {
  const response = await apiFetch<{ data: GuildRoleOption[] }>(
    `/api/v1/guilds/${guildId}/roles`,
  );
  return response.data ?? [];
}

export async function fetchPluginStorage(
  guildId: string,
  pluginId: string,
  key: string,
): Promise<unknown> {
  const response = await apiFetch<{ value: unknown }>(
    `/api/v1/guilds/${guildId}/plugins/${pluginId}/storage/${key}`,
  );
  return response.value;
}

export async function setPluginStorage(
  guildId: string,
  pluginId: string,
  key: string,
  value: unknown,
): Promise<void> {
  await apiFetch<{ value: unknown }>(
    `/api/v1/guilds/${guildId}/plugins/${pluginId}/storage/${key}`,
    { method: "PUT", body: JSON.stringify({ value }) },
  );
}

export async function fetchPluginTemplates(
  guildId: string,
  pluginId: string,
): Promise<PluginTemplate[]> {
  const response = await apiFetch<{ data: PluginTemplate[] }>(
    `/api/v1/guilds/${guildId}/plugins/${pluginId}/templates`,
  );
  return response.data ?? [];
}

export async function savePluginTemplate(
  guildId: string,
  pluginId: string,
  body: {
    name: string;
    type: string;
    contentMode: string;
    content: unknown;
    variables: string[];
    previewData: Record<string, string>;
  },
): Promise<PluginTemplate> {
  return apiFetch<PluginTemplate>(
    `/api/v1/guilds/${guildId}/plugins/${pluginId}/templates`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function testPluginTemplate(
  guildId: string,
  pluginId: string,
  name: string,
  body: { channelId?: string; variables: Record<string, string> },
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/guilds/${guildId}/plugins/${pluginId}/templates/${encodeURIComponent(name)}/test`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
  } catch {
    // Session may already be gone — treat as success.
  }
}

export async function fetchHealth(): Promise<{ status: "operational" | "degraded"; latencyMs: number }> {
  const start = performance.now();
  const response = await fetch("/api/v1/health", { credentials: "include" });
  const latencyMs = Math.round(performance.now() - start);
  return { status: response.ok ? "operational" : "degraded", latencyMs };
}

export const SECURITY_FEATURES = [
  { title: "OAuth 2.0 + PKCE", detail: "Authorization code flow with state validation and PKCE verifier." },
  { title: "AES-256-GCM tokens", detail: "Discord access and refresh tokens encrypted at rest." },
  { title: "Opaque HTTP-only sessions", detail: "Server-side PostgreSQL sessions, ID rotation after login." },
  { title: "Same-origin enforcement", detail: "State-changing requests reject cross-site origins." },
];

export const fmt = new Intl.NumberFormat("en-US");