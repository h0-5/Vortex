"use client";

/**
 * Plugin Studio — schema-driven plugin settings in a creative slide-over.
 * Renders the plugin's dashboard schema (tabs → sections → fields) with
 * live Discord-style message preview, dirty-state tracking, per-tab save
 * / reset, and a configuration-completion ring.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  HashIcon,
  Loader2Icon,
  RotateCcwIcon,
  SaveIcon,
  SendIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { VortexMark } from "@/components/vortex/brand";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  fetchGuildCategories,
  fetchGuildChannels,
  fetchGuildRoles,
  fetchPluginDashboardContent,
  fetchPluginStorage,
  fetchPluginTemplates,
  savePluginTemplate,
  setPluginStorage,
  testPluginTemplate,
  type DashboardAction,
  type DashboardField,
  type DashboardSchemaDoc,
  type DashboardSection,
  type GuildChannel,
  type GuildRoleOption,
  type Guild,
  type Plugin,
  type PluginDashboardContent,
  type PluginTemplate,
  type VortexUser,
} from "@/lib/vortex/data";

/* ------------------------------ path helpers ------------------------------ */

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getValueAtPath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  let current: unknown = source;
  for (const part of path.split(".")) {
    current = asRecord(current)[part];
    if (current === undefined) return undefined;
  }
  return current;
}

function setValueAtPath(source: unknown, path: string, value: unknown): Record<string, unknown> {
  const root = { ...asRecord(source) };
  let current = root;
  const parts = path.split(".");
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    current[part] = { ...asRecord(current[part]) };
    current = current[part] as Record<string, unknown>;
  });
  return root;
}

function defaultsObject(schema: DashboardSchemaDoc, storageKey: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema.defaults ?? {})) {
    if (key.startsWith(`${storageKey}.`)) {
      const merged = setValueAtPath(result, key.slice(storageKey.length + 1), value);
      Object.keys(merged).forEach((k) => (result[k] = merged[k]));
    }
  }
  return result;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function substituteVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

function isMessage(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && "type" in value;
}

/* ------------------------------- sub pieces ------------------------------- */

function CompletionRing({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative inline-flex size-10 items-center justify-center" title={`${pct}% configured`}>
      <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="url(#studio-ring)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="studio-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-mono text-[9px] font-bold text-foreground/80">{pct}%</span>
    </span>
  );
}

function FieldFrame({
  field,
  children,
  wide,
}: {
  field: DashboardField;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-2", wide && "sm:col-span-2")}>
      <label htmlFor={field.id} dir="auto" className="text-[13px] font-semibold leading-tight">
        {field.label}
      </label>
      {children}
      {field.description ? (
        <p dir="auto" className="text-[11.5px] leading-relaxed text-muted-foreground/90">
          {field.description}
        </p>
      ) : null}
    </div>
  );
}

const selectTriggerClass =
  "h-10 border-white/10 bg-white/[0.04] text-[13px] shadow-none transition-all focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:border-primary/50 hover:border-white/20 data-[placeholder]:text-muted-foreground";

/* ------------------------------ field renderer ---------------------------- */

function StudioField({
  field,
  draft,
  channels,
  roles,
  categories,
  templates,
  previewVars,
  onChange,
}: {
  field: DashboardField;
  draft: Record<string, unknown>;
  channels: GuildChannel[];
  roles: GuildRoleOption[];
  categories: GuildChannel[];
  templates: PluginTemplate[];
  previewVars?: Record<string, string>;
  onChange: (field: DashboardField, value: unknown) => void;
}) {
  const stored = draft[field.storageKey] ?? {};
  const value = getValueAtPath(stored, field.path) ?? field.defaultValue;

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/[0.12] sm:col-span-2">
        <div className="min-w-0">
          <p dir="auto" className="text-[13px] font-semibold leading-tight">{field.label}</p>
          {field.description ? (
            <p dir="auto" className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground/90">
              {field.description}
            </p>
          ) : null}
        </div>
        <Switch
          id={field.id}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(field, checked)}
          className="data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_14px_-2px_rgba(139,92,246,0.8)]"
          aria-label={field.label}
        />
      </div>
    );
  }

  if (field.type === "channel_select" || field.type === "category_select" || field.type === "role_select") {
    const list =
      field.type === "channel_select" ? channels : field.type === "role_select" ? roles : categories;
    const prefix = field.type === "role_select" ? "@" : field.type === "category_select" ? "" : "#";
    return (
      <FieldFrame field={field}>
        <Select
          value={typeof value === "string" && value ? value : "none"}
          onValueChange={(next) => onChange(field, next === "none" ? null : next)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="اختر…" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0a0a0c]">
            <SelectItem value="none" className="text-muted-foreground">— بدون —</SelectItem>
            {list.map((item) => (
              <SelectItem key={item.id} value={item.id} dir="auto" className="text-[13px]">
                <span className="inline-flex items-center gap-1.5">
                  {field.type === "role_select" ? (
                    <span
                      className="size-2 rounded-full"
                      style={{ background: `#${((item as GuildRoleOption).color || 0x99a).toString(16).padStart(6, "0")}` }}
                    />
                  ) : (
                    <HashIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                  )}
                  {prefix}
                  {item.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldFrame>
    );
  }

  if (field.type === "select" || field.type === "template_select") {
    const options =
      field.type === "select"
        ? (field.options ?? [])
        : [
            ...(typeof value === "string" && value ? [{ label: value, value }] : []),
            ...templates.map((t) => ({ label: t.name, value: t.name })),
          ];
    return (
      <FieldFrame field={field}>
        <Select
          value={typeof value === "string" && value ? value : undefined}
          onValueChange={(next) => onChange(field, next)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="اختر…" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0a0a0c]">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} dir="auto" className="text-[13px]">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldFrame>
    );
  }

  if (field.type === "number") {
    return (
      <FieldFrame field={field}>
        <Input
          id={field.id}
          type="number"
          value={Number(value ?? 0)}
          onChange={(event) => onChange(field, Number(event.target.value))}
          className="h-10 border-white/10 bg-white/[0.04] font-mono text-[13px] transition-all focus-visible:ring-1 focus-visible:ring-primary/60"
        />
      </FieldFrame>
    );
  }

  if (field.type === "text") {
    return (
      <FieldFrame field={field}>
        {field.multiline ? (
          <Textarea
            id={field.id}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            rows={4}
            dir="auto"
            onChange={(event) => onChange(field, event.target.value)}
            className="border-white/10 bg-white/[0.04] text-[13px] transition-all focus-visible:ring-1 focus-visible:ring-primary/60"
          />
        ) : (
          <Input
            id={field.id}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            dir="auto"
            onChange={(event) => onChange(field, event.target.value)}
            className="h-10 border-white/10 bg-white/[0.04] text-[13px] transition-all focus-visible:ring-1 focus-visible:ring-primary/60"
          />
        )}
      </FieldFrame>
    );
  }

  if (field.type === "message_composer") {
    const message = isMessage(value) ? value : { type: "text", content: "" };
    const mode = message.type === "embed" ? "embed" : message.type === "components_v2" ? "components_v2" : "text";
    const modes = field.contentModes ?? ["text", "embed"];
    return (
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FieldFrame field={field}>
          <div className="flex items-center gap-1.5">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  onChange(
                    field,
                    m === "text"
                      ? { type: "text", content: "" }
                      : m === "embed"
                        ? { type: "embed", title: "", description: "", fields: [] }
                        : { type: "components_v2", components: [] },
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-wide transition-all",
                  mode === m
                    ? "border-primary/60 bg-primary/15 text-foreground"
                    : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
                )}
              >
                {m === "text" ? "نص" : m === "embed" ? "إمبد" : "مكونات"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              {mode === "text" ? (
                <Textarea
                  value={typeof message.content === "string" ? message.content : ""}
                  placeholder={field.placeholder ?? "اكتب الرسالة…"}
                  rows={5}
                  dir="auto"
                  onChange={(event) => onChange(field, { ...message, content: event.target.value })}
                  className="border-white/10 bg-white/[0.04] text-[13px] focus-visible:ring-1 focus-visible:ring-primary/60"
                />
              ) : mode === "embed" ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={typeof message.title === "string" ? message.title : ""}
                    placeholder="عنوان الإمبد"
                    dir="auto"
                    onChange={(event) => onChange(field, { ...message, title: event.target.value })}
                    className="h-9 border-white/10 bg-white/[0.04] text-[13px] focus-visible:ring-1 focus-visible:ring-primary/60"
                  />
                  <Textarea
                    value={typeof message.description === "string" ? message.description : ""}
                    placeholder="وصف الإمبد…"
                    rows={3}
                    dir="auto"
                    onChange={(event) => onChange(field, { ...message, description: event.target.value })}
                    className="border-white/10 bg-white/[0.04] text-[13px] focus-visible:ring-1 focus-visible:ring-primary/60"
                  />
                </div>
              ) : (
                <Textarea
                  value={JSON.stringify(message, null, 2)}
                  rows={5}
                  onChange={(event) => {
                    try {
                      onChange(field, JSON.parse(event.target.value));
                    } catch {
                      /* keep typing — invalid JSON mid-edit */
                    }
                  }}
                  className="border-white/10 bg-white/[0.04] font-mono text-[11.5px] focus-visible:ring-1 focus-visible:ring-primary/60"
                />
              )}
            </div>
            <MessagePreview message={message} extraVars={previewVars} />
          </div>
        </FieldFrame>
      </div>
    );
  }

  return null;
}

function MessagePreview({
  message,
  extraVars,
}: {
  message: Record<string, unknown>;
  extraVars?: Record<string, string>;
}) {
  const vars: Record<string, string> = {
    userName: "𝓗𝓪𝓭𝓮",
    serverName: "Vortex Community",
    memberCount: "18,420",
    ...extraVars,
  };
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#1e1f22]">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-3 py-1.5">
        <span className="text-[10px] font-semibold text-white/40"># preview</span>
        <SparklesIcon className="size-3 text-primary/70" aria-hidden="true" />
      </div>
      <div className="flex gap-2.5 p-3">
        <VortexMark size={30} className="mt-0.5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            Vortex
            <span className="rounded bg-primary px-1 py-px text-[9px] font-bold uppercase text-white">app</span>
          </p>
          {message.type === "embed" ? (
            <div className="mt-1 border-l-4 border-primary/80 bg-white/[0.03] py-2 pl-3 pr-2">
              {message.title ? (
                <p dir="auto" className="text-[13px] font-bold text-white">
                  {substituteVariables(String(message.title), vars)}
                </p>
              ) : null}
              {message.description ? (
                <p dir="auto" className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-white/75">
                  {substituteVariables(String(message.description), vars)}
                </p>
              ) : null}
            </div>
          ) : (
            <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">
              {substituteVariables(String(message.content ?? ""), vars) || (
                <span className="text-white/30">اكتب لترى المعاينة…</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ main drawer ------------------------------- */

export function PluginStudio({
  guild,
  user,
  plugin,
  iconNode,
  onClose,
}: {
  guild: Guild;
  user: VortexUser;
  plugin: Plugin;
  iconNode: typeof ShieldCheckIcon;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");
  const [content, setContent] = useState<PluginDashboardContent>({
    mode: "none",
    schema: null,
    bundleUrl: null,
    errors: [],
  });
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [roles, setRoles] = useState<GuildRoleOption[]>([]);
  const [categories, setCategories] = useState<GuildChannel[]>([]);
  const [templates, setTemplates] = useState<PluginTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const schema = content?.schema ?? null;

  const storageKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!schema) return [];
    for (const tab of schema.tabs) {
      if (tab.id !== activeTab) continue;
      for (const section of tab.sections) {
        for (const field of section.fields) keys.add(field.storageKey);
        for (const action of section.actions) {
          if (action.type === "save_storage") (action.storageKeys ?? []).forEach((k) => keys.add(k));
        }
      }
    }
    return [...keys];
  }, [schema, activeTab]);

  const dirty = useMemo(
    () => stableStringify(draft) !== stableStringify(snapshot),
    [draft, snapshot],
  );

  const configuredRatio = useMemo(() => {
    if (!schema) return 0;
    let total = 0;
    let changed = 0;
    for (const key of new Set(schema.tabs.flatMap((t) => t.sections.flatMap((s) => s.fields.map((f) => f.storageKey))))) {
      const defaults = defaultsObject(schema, key);
      for (const tab of schema.tabs) {
        for (const section of tab.sections) {
          for (const field of section.fields) {
            if (field.storageKey !== key) continue;
            total += 1;
            const current = getValueAtPath(asRecord(draft[key] ?? defaults), field.path);
            const base = getValueAtPath(defaults, field.path) ?? field.defaultValue;
            if (stableStringify(current ?? null) !== stableStringify(base ?? null)) changed += 1;
          }
        }
      }
    }
    return total === 0 ? 0 : changed / total;
  }, [schema, draft]);

  /* load everything on open */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setError("");
      try {
        const detail = await fetchPluginDashboardContent(guild.id, plugin.id);
        if (cancelled) return;
        setContent(detail);
        const nextTab = detail.schema?.tabs[0]?.id ?? "";
        setActiveTab(nextTab);

        if (detail.mode === "schema" && detail.schema) {
          const keys = [
            ...new Set(
              detail.schema.tabs.flatMap((t) => t.sections.flatMap((s) => s.fields.map((f) => f.storageKey))),
            ),
          ];
          const [ch, rl, ct, tp, ...values] = await Promise.all([
            fetchGuildChannels(guild.id),
            fetchGuildRoles(guild.id),
            fetchGuildCategories(guild.id),
            fetchPluginTemplates(guild.id, plugin.id),
            ...keys.map((key) => fetchPluginStorage(guild.id, plugin.id, key)),
          ]);
          if (cancelled) return;
          setChannels(ch);
          setRoles(rl);
          setCategories(ct);
          setTemplates(tp);

          const nextDraft: Record<string, unknown> = {};
          keys.forEach((key, index) => {
            const stored = values[index];
            nextDraft[key] =
              stored ?? defaultsObject(detail.schema as DashboardSchemaDoc, key);
          });
          setDraft(nextDraft);
          setSnapshot(structuredClone(nextDraft));
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guild.id, plugin.id]);

  /* scroll lock */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const setFieldValue = useCallback((field: DashboardField, value: unknown) => {
    setDraft((current) => ({
      ...current,
      [field.storageKey]: setValueAtPath(
        current[field.storageKey] ?? {},
        field.path,
        value,
      ),
    }));
  }, []);

  /* template variable context for save_template / test_template */
  const previewVars = useMemo(() => {
    if (!schema) return {};
    return {
      ...schema.previewVariables,
      user: `<@${user.id}>`,
      userName: user.username,
      userDisplayName: user.globalName,
      userId: user.id,
      serverName: guild.name,
      serverId: guild.id,
      memberCount: String(guild.memberCount ?? 0),
    };
  }, [schema, user, guild]);

  const runSave = useCallback(async () => {
    if (!schema) return;
    const actions = schema.tabs
      .find((t) => t.id === activeTab)
      ?.sections.flatMap((s) => s.actions) ?? [];
    const saveActions = actions.filter((a) => a.type === "save_storage" || a.type === "save_template");
    if (saveActions.length === 0) {
      toast.info("Nothing to save in this tab", { description: "هذا التبويب لا يحتوي على إجراء حفظ." });
      return;
    }
    setSaving(true);
    try {
      for (const action of saveActions) {
        if (action.type === "save_storage") {
          for (const key of action.storageKeys ?? []) {
            await setPluginStorage(guild.id, plugin.id, key, draftRef.current[key] ?? defaultsObject(schema, key));
          }
        } else if (action.type === "save_template") {
          const name = String(
            getValueAtPath(draftRef.current.settings, action.templateNamePath ?? "") ||
              action.templateContentPath ||
              "Template",
          );
          const contentValue =
            getValueAtPath(draftRef.current.templates, action.templateContentPath ?? name) ??
            schema.defaultMessages[action.templateContentPath ?? name] ??
            { type: "text", content: "" };
          const mode = isMessage(contentValue) && contentValue.type === "embed" ? "embed" : "text";
          await savePluginTemplate(guild.id, plugin.id, {
            name,
            type: action.templateType ?? "default",
            contentMode: mode,
            content: contentValue,
            variables: [],
            previewData: schema.previewVariables,
          });
        }
      }
      setSnapshot(structuredClone(draftRef.current));
      toast.success("Settings saved", { description: `${plugin.name} — تم حفظ الإعدادات على الغيتواي.` });
    } catch (err) {
      toast.error("Could not save settings", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }, [schema, activeTab, guild.id, plugin.id, plugin.name]);

  const runReset = useCallback(() => {
    if (!schema) return;
    const next = { ...draftRef.current };
    for (const key of storageKeys) next[key] = defaultsObject(schema, key);
    setDraft(next);
    toast("Restored defaults for this tab", { description: "تمت استعادة الافتراضيات (غير محفوظة بعد)." });
  }, [schema, storageKeys]);

  const runTest = useCallback(
    async (action: DashboardAction) => {
      if (!schema) return;
      setTestingId(action.id);
      try {
        const settings = asRecord(draftRef.current.settings);
        const name = String(
          getValueAtPath(settings, action.templateNamePath ?? "") || action.templateContentPath || "Template",
        );
        const channelId = getValueAtPath(settings, action.channelIdPath ?? "");
        await testPluginTemplate(guild.id, plugin.id, name, {
          ...(typeof channelId === "string" && channelId ? { channelId } : {}),
          variables: previewVars,
        });
        toast.success("Test message sent", { description: "تم إرسال رسالة تجريبية للقناة المحددة." });
      } catch (err) {
        toast.error("Test failed", { description: err instanceof Error ? err.message : String(err) });
      } finally {
        setTestingId(null);
      }
    },
    [schema, guild.id, plugin.id, previewVars],
  );

  /* keyboard: Esc close, Ctrl/Cmd+S save */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !saving) void runSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, saving, runSave, onClose]);

  const Icon = iconNode;
  const tab = schema?.tabs.find((t) => t.id === activeTab) ?? null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${plugin.name} settings`}>
      {/* backdrop */}
      <button
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      {/* drawer */}
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[780px] translate-x-0 flex-col border-l border-white/10 bg-[#050507]/95 shadow-[0_0_80px_rgba(139,92,246,0.15)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

        {/* header */}
        <div className="flex items-center gap-3.5 border-b border-white/[0.07] px-6 py-4">
          <span className="nx-gradient flex size-11 items-center justify-center rounded-xl text-white nx-glow">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[16px] font-bold tracking-tight">{plugin.name}</h2>
              <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                v{plugin.version}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <span className={cn("nx-live-dot inline-block size-1.5 rounded-full", plugin.enabled ? "bg-[#34d399] text-[#34d399]" : "bg-white/30")} />
              {plugin.enabled ? "active on shard 0" : "disabled"} · @{plugin.author}
            </p>
          </div>
          {schema ? <CompletionRing ratio={configuredRatio} /> : null}
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-all hover:border-white/25 hover:text-foreground"
            aria-label="Close"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* tabs */}
        {schema && schema.tabs.length > 1 ? (
          <div className="flex flex-wrap gap-2 border-b border-white/[0.07] px-6 py-3">
            {schema.tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                dir="auto"
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150",
                  activeTab === t.id
                    ? "border-primary/60 bg-primary/15 text-foreground shadow-[0_0_16px_-6px_rgba(139,92,246,0.9)]"
                    : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {status === "loading" ? (
            <div className="flex flex-col gap-4 pt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="nx-shimmer h-24 rounded-xl border border-white/[0.05] bg-white/[0.02]" />
              ))}
              <p className="text-center text-xs text-muted-foreground">Loading plugin configuration…</p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <AlertTriangleIcon className="size-8 text-[#f87171]" aria-hidden="true" />
              <p className="text-sm font-semibold">Could not load settings</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{error}</p>
            </div>
          ) : !schema || content?.mode !== "schema" ? (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <Settings2Icon className="size-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm font-semibold">No configurable dashboard</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                {content?.mode === "bundle"
                  ? "This plugin ships a custom bundled UI — open it from the plugin's own route."
                  : "This plugin does not expose dashboard settings."}
              </p>
            </div>
          ) : tab ? (
            <div className="flex flex-col gap-5">
              {tab.description ? (
                <p dir="auto" className="text-[12.5px] leading-relaxed text-muted-foreground">{tab.description}</p>
              ) : null}
              {tab.sections.map((section, sectionIndex) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  accent={sectionIndex % 2 === 0 ? "#8b5cf6" : "#06b6d4"}
                  draft={draft}
                  channels={channels}
                  roles={roles}
                  categories={categories}
                  templates={templates}
                  previewVars={previewVars}
                  onChange={setFieldValue}
                  onTest={runTest}
                  testingId={testingId}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* footer */}
        {schema && status === "ready" ? (
          <div className="flex items-center gap-3 border-t border-white/[0.07] bg-black/40 px-6 py-3.5">
            <span
              className={cn(
                "flex items-center gap-2 text-[11.5px] font-semibold transition-opacity",
                dirty ? "text-[#fbbf24]" : "text-muted-foreground/60 opacity-0",
              )}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#fbbf24] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#fbbf24]" />
              </span>
              Unsaved changes · ⌘S
            </span>
            <div className="ml-auto flex items-center gap-2.5">
              <button
                onClick={runReset}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-white/25 hover:text-foreground disabled:opacity-50"
              >
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                Reset tab
              </button>
              <button
                onClick={runSave}
                disabled={saving || !dirty}
                className="nx-gradient flex items-center gap-1.5 rounded-lg px-4.5 py-2 text-xs font-bold text-white shadow-[0_0_20px_-6px_rgba(139,92,246,0.9)] transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
              >
                {saving ? (
                  <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <SaveIcon className="size-3.5" aria-hidden="true" />
                )}
                Save settings
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


function SectionCard({
  section,
  accent,
  draft,
  channels,
  roles,
  categories,
  templates,
  previewVars,
  onChange,
  onTest,
  testingId,
}: {
  section: DashboardSection;
  accent: string;
  draft: Record<string, unknown>;
  channels: GuildChannel[];
  roles: GuildRoleOption[];
  categories: GuildChannel[];
  templates: PluginTemplate[];
  previewVars?: Record<string, string>;
  onChange: (field: DashboardField, value: unknown) => void;
  onTest: (action: DashboardAction) => void;
  testingId: string | null;
}) {
  const testActions = section.actions.filter((a) => a.type === "test_template");
  return (
    <section className="nx-glass overflow-hidden rounded-xl">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-8 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} />
          <div>
            <h3 dir="auto" className="text-[13.5px] font-bold tracking-tight">{section.title}</h3>
            {section.description ? (
              <p dir="auto" className="mt-0.5 text-[11.5px] text-muted-foreground">{section.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {testActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onTest(action)}
              disabled={testingId !== null}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-foreground transition-all hover:bg-primary/20 disabled:opacity-50"
            >
              {testingId === action.id ? (
                <Loader2Icon className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <SendIcon className="size-3" aria-hidden="true" />
              )}
              <span dir="auto">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {section.fields.map((field) => (
          <StudioField
            key={field.id}
            field={field}
            draft={draft}
            channels={channels}
            roles={roles}
            categories={categories}
            templates={templates}
            previewVars={previewVars}
            onChange={onChange}
          />
        ))}
        {section.fields.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground sm:col-span-2">No settings in this section.</p>
        ) : null}
      </div>
    </section>
  );
}
