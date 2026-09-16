import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  CoreFormSection,
  CoreSaveBar,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vortex/ui';
import { useQueryClient } from '@tanstack/react-query';
import type {
  AppSettingsAdvanced,
  AppSettingsAppearance,
  AppSettingsBranding,
  AppSettingsDebug,
  AppSettingsGeneral,
  AppSettingsIntegrations,
  AppSettingsPwa,
  AppSettingsSecurity,
} from '@vortex/types';
import {
  appSettingsAdvancedShape,
  appSettingsAppearanceShape,
  appSettingsBrandingShape,
  appSettingsDebugShape,
  appSettingsGeneralShape,
  appSettingsIntegrationsShape,
  appSettingsPwaShape,
  appSettingsSecurityShape,
} from '@vortex/types';
import { UploadIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { api } from '../../lib/api-client.js';
import { CoreSwitch } from '@vortex/ui';

export type SectionProps<T> = {
  value: T;
  onSave: (patch: Partial<T>) => void;
  isSaving: boolean;
};

const generalSchema = appSettingsGeneralShape;
const brandingSchema = appSettingsBrandingShape;
const appearanceSchema = appSettingsAppearanceShape;
const pwaSchema = appSettingsPwaShape;
const debugSchema = appSettingsDebugShape;
const securitySchema = appSettingsSecurityShape;
const integrationsSchema = appSettingsIntegrationsShape;
const advancedSchema = appSettingsAdvancedShape;

export function GeneralSection({ value, onSave, isSaving }: SectionProps<AppSettingsGeneral>) {
  const form = useForm<AppSettingsGeneral>({
    resolver: zodResolver(generalSchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="General" description="Basic platform identity and defaults.">
          <FormField
            control={form.control}
            name="appName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>App name</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={100} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="appDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>App description</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    maxLength={300}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supportUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Support URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    type="url"
                    placeholder="https://"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    type="url"
                    placeholder="https://"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultLanguage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default language</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save general"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

export function BrandingSection({ value, onSave, isSaving }: SectionProps<AppSettingsBranding>) {
  const form = useForm<AppSettingsBranding>({
    resolver: zodResolver(brandingSchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="Branding" description="Customize logos, colors, and favicon.">
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL</FormLabel>
                <FormControl>
                  <ImageUrlOrUpload
                    id="logo-url"
                    value={field.value ?? ''}
                    onChange={(url) => field.onChange(url || null)}
                    onUpload={(url) => field.onChange(url)}
                    placeholder="https://"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    disabled={isSaving}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="faviconUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Favicon URL</FormLabel>
                <FormControl>
                  <ImageUrlOrUpload
                    id="favicon-url"
                    value={field.value ?? ''}
                    onChange={(url) => field.onChange(url || null)}
                    onUpload={(url) => field.onChange(url)}
                    placeholder="https://"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                    disabled={isSaving}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="primaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <Input {...field} maxLength={7} />
                    <Input
                      type="color"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="size-9 p-0"
                      aria-label="Primary color picker"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save branding"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

export function AppearanceSection({ value, onSave, isSaving }: SectionProps<AppSettingsAppearance>) {
  const form = useForm<AppSettingsAppearance>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="Appearance" description="Theme and layout preferences.">
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sidebarVariant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sidebar variant</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save appearance"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

export function PwaSection({ value, onSave, isSaving }: SectionProps<AppSettingsPwa>) {
  const form = useForm<AppSettingsPwa>({
    resolver: zodResolver(pwaSchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="PWA" description="Progressive web app manifest options.">
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoreSwitch
                    id="pwa-enabled"
                    label="Enable PWA"
                    description="Expose a web app manifest."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSaving}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="installPromptEnabled"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoreSwitch
                    id="pwa-install-prompt"
                    label="Enable install prompt"
                    description="Allow the dashboard to offer app installation when supported."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSaving}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="offlineSupportEnabled"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoreSwitch
                    id="pwa-offline-support"
                    label="Offline support"
                    description="Persist the offline-support preference for the PWA runtime."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSaving}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="shortName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Short name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    maxLength={64}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="themeColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <Input {...field} maxLength={7} />
                    <Input
                      type="color"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="size-9 p-0"
                      aria-label="PWA theme color picker"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="backgroundColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Background color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <Input {...field} maxLength={7} />
                    <Input
                      type="color"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="size-9 p-0"
                      aria-label="PWA background color picker"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save PWA"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

export function DebugSection({ value, onSave, isSaving }: SectionProps<AppSettingsDebug>) {
  const form = useForm<AppSettingsDebug>({
    resolver: zodResolver(debugSchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="Debug" description="Developer and diagnostic toggles.">
          <FormField
            control={form.control}
            name="verboseLogging"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoreSwitch
                    id="verbose-logging"
                    label="Verbose logging"
                    description="Emit detailed server logs."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSaving}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="exposePluginApiDocs"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoreSwitch
                    id="expose-api-docs"
                    label="Expose plugin API docs"
                    description="Show raw OpenAPI-style docs in Core APIs."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSaving}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save debug"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

export function SecuritySection({ value, onSave, isSaving }: SectionProps<AppSettingsSecurity>) {
  const form = useForm<AppSettingsSecurity>({
    resolver: zodResolver(securitySchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="Security" description="Authentication and session policies.">
          <FormField
            control={form.control}
            name="requireEmailVerification"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoreSwitch
                    id="require-email"
                    label="Require email verification"
                    description="Block login until email is verified."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSaving}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sessionDurationHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session duration (hours)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={720}
                    onChange={(event) => field.onChange(Number.parseInt(event.target.value, 10) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save security"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

export function IntegrationsSection({
  value,
  onSave,
  isSaving,
}: SectionProps<AppSettingsIntegrations>) {
  const form = useForm<AppSettingsIntegrations>({
    resolver: zodResolver(integrationsSchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="Integrations" description="Third-party service hooks.">
          <FormField
            control={form.control}
            name="discordWebhookUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discord webhook URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save integrations"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

export function AdvancedSection({ value, onSave, isSaving }: SectionProps<AppSettingsAdvanced>) {
  const form = useForm<AppSettingsAdvanced>({
    resolver: zodResolver(advancedSchema),
    defaultValues: value,
  });

  useEffect(() => {
    form.reset(value);
  }, [value, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <CoreFormSection title="Advanced" description="Experimental and capacity limits.">
          <FormField
            control={form.control}
            name="enableExperimentalFeatures"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CoreSwitch
                    id="experimental-features"
                    label="Experimental features"
                    description="Enable unfinished dashboard features."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSaving}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxGuildsPerUser"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max guilds per user</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={1000}
                    onChange={(event) => field.onChange(Number.parseInt(event.target.value, 10) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <CoreSaveBar
            isDirty={form.formState.isDirty}
            isSubmitting={isSaving}
            onReset={() => form.reset(value)}
            saveLabel="Save advanced"
          />
        </CoreFormSection>
      </form>
    </Form>
  );
}

function ImageUrlOrUpload({
  id,
  label,
  value,
  onChange,
  onUpload,
  placeholder,
  accept,
  disabled,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (url: string) => void;
  placeholder?: string;
  accept?: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const kind = id === 'favicon-url' ? 'favicon' : 'logo';
      const next = await api.uploadBrandingAsset(kind, file);
      queryClient.setQueryData(['app-settings'], next);
      const url = kind === 'favicon' ? next.branding.faviconUrl : next.branding.logoUrl;
      if (url) {
        onUpload(url);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to upload ${label?.toLowerCase() ?? 'image'}.`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="grid gap-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="flex min-w-0 items-center gap-2">
        <Input
          id={id}
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || uploading}
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFileChange}
          id={`${id}-file`}
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          aria-label={`Upload ${label ?? 'image'}`}
        >
          <UploadIcon className="size-4" />
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange('')}
            disabled={disabled || uploading}
            aria-label={`Clear ${label ?? 'image'}`}
          >
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>
      {value ? (
        <div className="mt-1 flex min-w-0 items-center gap-3 rounded-md border border-border bg-muted/30 p-2">
          <img src={value} alt="" className="size-8 rounded object-contain" />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={value}>{value}</span>
        </div>
      ) : null}
    </div>
  );
}
