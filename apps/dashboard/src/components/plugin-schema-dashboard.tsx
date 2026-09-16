import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@vortex/ui';
import type {
  CoreMessage,
  GuildDetail,
  PluginDashboardAction,
  PluginDashboardField,
  PluginDashboardSchemaDocument,
  PluginDashboardSection,
  User,
} from '@vortex/types';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircleIcon, SaveIcon, SendIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import {
  botProfileQuery,
  currentUserQuery,
  guildCategoriesQuery,
  guildChannelsQuery,
  guildPluginStorageQuery,
  guildPluginTemplatesQuery,
  guildQuery,
  guildRolesQuery,
} from '../hooks/queries.js';
import { api } from '../lib/api-client.js';
import { CoreSwitch } from './core-switch.js';
import { ErrorState } from './error-state.js';
import { createDefaultMessage, MessageComposer, type MessageMode } from './message-composer.js';

interface PluginSchemaDashboardProps {
  guildId: string;
  pluginId: string;
  schema: PluginDashboardSchemaDocument;
  tabId: string;
}

export function PluginSchemaDashboard({ guildId, pluginId, schema, tabId }: PluginSchemaDashboardProps) {
  const tab = schema.tabs.find((candidate) => candidate.id === tabId);
  const storageKeys = useMemo(() => getStorageKeys(schema), [schema]);
  const storageQueries = useQueries({
    queries: storageKeys.map((key) => ({
      ...guildPluginStorageQuery(guildId, pluginId, key),
      enabled: key !== 'templates',
    })),
  });
  const templates = useQuery(guildPluginTemplatesQuery(guildId, pluginId));
  const fieldTypes = useMemo(() => getFieldTypes(schema), [schema]);
  const channels = useQuery({ ...guildChannelsQuery(guildId), enabled: fieldTypes.has('channel_select') });
  const categories = useQuery({ ...guildCategoriesQuery(guildId), enabled: fieldTypes.has('category_select') });
  const roles = useQuery({ ...guildRolesQuery(guildId), enabled: fieldTypes.has('role_select') });
  const botProfile = useQuery(botProfileQuery);
  const currentUser = useQuery(currentUserQuery);
  const guild = useQuery(guildQuery(guildId));

  const [draft, setDraft] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const nextDraft: Record<string, unknown> = {};
    storageKeys.forEach((key, index) => {
      if (key === 'templates') return;
      const value = storageQueries[index]?.data?.value;
      nextDraft[key] = value ?? getDefaultObject(schema, key);
    });
    setDraft((current) => ({ ...current, ...nextDraft }));
  }, [schema, storageKeys, storageQueries.map((query) => query.dataUpdatedAt).join(':')]);

  if (!tab) {
    return <PluginSchemaError title="Tab not found" message={`The requested tab is not available for this plugin.`} />;
  }

  if (
    storageQueries.some((query) => query.isLoading) ||
    templates.isLoading ||
    channels.isLoading ||
    categories.isLoading ||
    roles.isLoading ||
    currentUser.isLoading ||
    guild.isLoading
  ) {
    return <Skeleton className="h-96 w-full" />;
  }

  const failedQuery = [...storageQueries, templates, channels, categories, roles, currentUser, guild].find((query) => query.isError);
  if (failedQuery?.error) {
    return <ErrorState message={(failedQuery.error as Error).message} onRetry={() => window.location.reload()} />;
  }

  const context: SchemaRenderContext = {
    guildId,
    pluginId,
    schema,
    draft,
    channels: channels.data?.data ?? [],
    categories: categories.data?.data ?? [],
    roles: roles.data?.data ?? [],
    templates: templates.data?.data ?? [],
    currentUser: currentUser.data,
    guild: guild.data,
    setFieldValue(field, value) {
      setDraft((current) => ({
        ...current,
        [field.storageKey]: setValueAtPath(current[field.storageKey] ?? getDefaultObject(schema, field.storageKey), field.path, value),
      }));
    },
    setTemplateValue(field, value) {
      setDraft((current) => ({
        ...current,
        templates: { ...(asRecord(current.templates)), [field.path]: value },
      }));
    },
  };
  if (botProfile.data?.username) {
    context.botName = botProfile.data.username;
  }
  if (botProfile.data?.avatarUrl) {
    context.botAvatarUrl = botProfile.data.avatarUrl;
  }

  return (
    <div className="flex flex-col gap-5">
      {tab.description ? <p className="text-sm text-muted-foreground">{tab.description}</p> : null}
      {tab.sections.length === 0 ? (
        <PluginSchemaError title="No tab content" message={`The ${tab.label} tab does not have any configurable sections.`} />
      ) : (
        tab.sections.map((section) => <SchemaSection key={section.id} section={section} context={context} />)
      )}
    </div>
  );
}

function SchemaSection({ section, context }: { section: PluginDashboardSection; context: SchemaRenderContext }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm">{section.title}</CardTitle>
            {section.description ? <p className="mt-1 text-sm text-muted-foreground">{section.description}</p> : null}
          </div>
          <SchemaActions actions={section.actions} context={context} />
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {section.fields.length === 0 ? (
          <Empty className="min-h-40 border-dashed">
            <EmptyHeader>
              <EmptyTitle className="text-base">No settings</EmptyTitle>
              <EmptyDescription>This section does not have any configurable settings.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {section.fields.map((field) => <SchemaField key={field.id} field={field} context={context} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SchemaField({ field, context }: { field: PluginDashboardField; context: SchemaRenderContext }) {
  const value = getFieldValue(context, field);
  if (field.type === 'switch') {
    const switchProps = field.description ? { description: field.description } : {};
    return (
      <CoreSwitch
        id={field.id}
        label={field.label}
        {...switchProps}
        checked={Boolean(value)}
        onCheckedChange={(checked) => context.setFieldValue(field, checked)}
      />
    );
  }
  if (field.type === 'channel_select') {
    return (
      <SchemaFieldFrame field={field}>
        <Select value={typeof value === 'string' ? value : 'none'} onValueChange={(next) => context.setFieldValue(field, next === 'none' ? null : next)}>
          <SelectTrigger><SelectValue placeholder="Select a channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No channel</SelectItem>
            {context.channels.map((channel) => <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </SchemaFieldFrame>
    );
  }
  if (field.type === 'category_select') {
    return (
      <SchemaFieldFrame field={field}>
        <Select value={typeof value === 'string' ? value : 'none'} onValueChange={(next) => context.setFieldValue(field, next === 'none' ? null : next)}>
          <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {context.categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </SchemaFieldFrame>
    );
  }
  if (field.type === 'role_select') {
    return (
      <SchemaFieldFrame field={field}>
        <Select value={typeof value === 'string' ? value : 'none'} onValueChange={(next) => context.setFieldValue(field, next === 'none' ? null : next)}>
          <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No role</SelectItem>
            {context.roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </SchemaFieldFrame>
    );
  }
  if (field.type === 'select') {
    return (
      <SchemaFieldFrame field={field}>
        <Select value={String(value ?? '')} onValueChange={(next) => context.setFieldValue(field, next)}>
          <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </SchemaFieldFrame>
    );
  }
  if (field.type === 'template_select') {
    const names = new Set([String(value ?? field.defaultValue ?? ''), ...context.templates.map((template) => template.name)]);
    return (
      <SchemaFieldFrame field={field}>
        <Select value={String(value ?? '')} onValueChange={(next) => context.setFieldValue(field, next)}>
          <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
          <SelectContent>
            {[...names].filter(Boolean).map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </SchemaFieldFrame>
    );
  }
  if (field.type === 'number') {
    return (
      <SchemaFieldFrame field={field}>
        <Input type="number" value={Number(value ?? 0)} onChange={(event) => context.setFieldValue(field, Number(event.target.value))} />
      </SchemaFieldFrame>
    );
  }
  if (field.type === 'message_composer') {
    const message = getTemplateMessage(context, field);
    const mode = getMessageMode(message);
    const composerProps = {
      ...(field.placeholder ? { placeholder: field.placeholder } : {}),
      ...(context.botName ? { botName: context.botName } : {}),
      ...(context.botAvatarUrl ? { botAvatarUrl: context.botAvatarUrl } : {}),
    };
    return (
      <div className="md:col-span-2">
        <MessageComposer
          guildId={context.guildId}
          mode={mode}
          value={message}
          {...composerProps}
          previewVariables={resolveRuntimeVariables(context)}
          onModeChange={(nextMode) => context.setTemplateValue(field, createDefaultMessage(nextMode))}
          onChange={(nextMessage) => context.setTemplateValue(field, nextMessage)}
        />
      </div>
    );
  }
  if (field.type === 'text' && field.multiline) {
    return (
      <SchemaFieldFrame field={field}>
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => context.setFieldValue(field, event.target.value)}
          rows={6}
        />
      </SchemaFieldFrame>
    );
  }
  return (
    <SchemaFieldFrame field={field}>
      <Input value={String(value ?? '')} onChange={(event) => context.setFieldValue(field, event.target.value)} />
    </SchemaFieldFrame>
  );
}

function SchemaActions({ actions, context }: { actions: PluginDashboardAction[]; context: SchemaRenderContext }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (action: PluginDashboardAction) => runAction(action, context),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guilds', context.guildId, 'plugins', context.pluginId] });
      toast.success('Plugin dashboard saved.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (actions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.id} size="sm" variant={action.type === 'test_template' ? 'outline' : 'default'} disabled={mutation.isPending} onClick={() => mutation.mutate(action)}>
          {action.type === 'test_template' ? <SendIcon data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function PluginSchemaError({ title, message }: { title: string; message: string }) {
  return (
    <Empty className="min-h-64 border-dashed border-destructive/40 bg-destructive/5">
      <EmptyHeader>
        <AlertCircleIcon className="size-8 text-destructive" />
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function SchemaFieldFrame({ field, children }: { field: PluginDashboardField; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.id}>{field.label}</Label>
      {children}
      {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
    </div>
  );
}

function resolveRuntimeVariables(context: SchemaRenderContext): Record<string, string> {
  const fallback = context.schema.previewVariables ?? {};
  const user = context.currentUser;
  const guild = context.guild;

  if (!user || !guild) {
    return fallback;
  }

  const createdAt = new Date(user.createdAt);
  const ageDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86_400_000));

  return {
    user: `<@${user.discordId}>`,
    userName: user.username,
    userDisplayName: user.globalName ?? user.username,
    userId: user.discordId,
    userCreatedDate: createdAt.toLocaleDateString('en-US'),
    userCreatedDays: String(ageDays),
    serverName: guild.name,
    serverId: guild.id,
    memberCount: String(guild.memberCount ?? 0),
    inviter: fallback.inviter ?? 'Unavailable',
    inviterName: fallback.inviterName ?? 'Unavailable',
    inviterId: fallback.inviterId ?? '',
    invitesCount: fallback.invitesCount ?? '0',
    inviteCode: fallback.inviteCode ?? 'Unavailable',
  };
}

async function runAction(action: PluginDashboardAction, context: SchemaRenderContext): Promise<void> {
  if (action.type === 'save_storage') {
    for (const key of action.storageKeys ?? []) {
      await api.setGuildPluginStorage(context.guildId, context.pluginId, key, context.draft[key] ?? getDefaultObject(context.schema, key));
    }
    return;
  }
  if (action.type === 'save_template') {
    const name = String(getValueAtPath(context.draft.settings, action.templateNamePath ?? '') ?? action.templateContentPath ?? 'Template');
    const content = getValueAtPath(context.draft.templates, action.templateContentPath ?? name) ?? context.schema.defaultMessages[name] ?? createDefaultMessage('text');
    const mode = String(getValueAtPath(context.draft.settings, action.templateContentModePath ?? '') ?? getMessageMode(content as CoreMessage));
    await api.saveGuildPluginTemplate(context.guildId, context.pluginId, {
      name,
      type: action.templateType ?? 'default',
      contentMode: mode === 'components_v2' || mode === 'embed' ? mode : 'text',
      content,
      variables: [],
      previewData: context.schema.previewVariables,
    });
    return;
  }
  if (action.type === 'test_template') {
    const name = String(getValueAtPath(context.draft.settings, action.templateNamePath ?? '') ?? 'Template');
    const channelId = getValueAtPath(context.draft.settings, action.channelIdPath ?? '');
    const variables = resolveRuntimeVariables(context);
    await api.testGuildPluginTemplate(context.guildId, context.pluginId, name, {
      ...(typeof channelId === 'string' ? { channelId } : {}),
      variables,
    });
  }
}

function getStorageKeys(schema: PluginDashboardSchemaDocument): string[] {
  const keys = new Set<string>();
  for (const tab of schema.tabs) {
    for (const section of tab.sections) {
      for (const field of section.fields) keys.add(field.storageKey);
    }
  }
  return [...keys].sort();
}

function getFieldTypes(schema: PluginDashboardSchemaDocument): Set<string> {
  const types = new Set<string>();
  for (const tab of schema.tabs) {
    for (const section of tab.sections) {
      for (const field of section.fields) types.add(field.type);
    }
  }
  return types;
}

function getDefaultObject(schema: PluginDashboardSchemaDocument, storageKey: string): unknown {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema.defaults)) {
    if (key.startsWith(`${storageKey}.`)) {
      setValueAtPath(result, key.slice(storageKey.length + 1), value);
    }
  }
  return result;
}

function getFieldValue(context: SchemaRenderContext, field: PluginDashboardField): unknown {
  return getValueAtPath(context.draft[field.storageKey] ?? getDefaultObject(context.schema, field.storageKey), field.path) ?? field.defaultValue;
}

function getTemplateMessage(context: SchemaRenderContext, field: PluginDashboardField): CoreMessage {
  const draftMessage = getValueAtPath(context.draft.templates, field.path);
  if (isCoreMessage(draftMessage)) return draftMessage;
  const savedTemplate = context.templates.find((template) => template.name === field.path);
  if (savedTemplate && isCoreMessage(savedTemplate.content)) {
    return savedTemplate.content;
  }
  const defaultMessage = context.schema.defaultMessages[field.path];
  if (isCoreMessage(defaultMessage)) return defaultMessage;
  return createDefaultMessage('text');
}

function getMessageMode(message: CoreMessage | unknown): MessageMode {
  return isCoreMessage(message) && (message.type === 'embed' || message.type === 'components_v2') ? message.type : 'text';
}

function isCoreMessage(value: unknown): value is CoreMessage {
  return typeof value === 'object' && value !== null && 'type' in value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getValueAtPath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (typeof current !== 'object' || current === null || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setValueAtPath(source: unknown, path: string, value: unknown): Record<string, unknown> {
  const root = { ...asRecord(source) };
  let current = root;
  const parts = path.split('.');
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

interface SchemaRenderContext {
  guildId: string;
  pluginId: string;
  schema: PluginDashboardSchemaDocument;
  draft: Record<string, unknown>;
  channels: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  templates: Array<{ name: string; content: unknown }>;
  currentUser?: User | undefined;
  guild?: GuildDetail | undefined;
  botName?: string | undefined;
  botAvatarUrl?: string | undefined;
  setFieldValue: (field: PluginDashboardField, value: unknown) => void;
  setTemplateValue: (field: PluginDashboardField, value: CoreMessage) => void;
}
