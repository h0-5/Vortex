import { Injectable } from '@nestjs/common';
import {
  appSettingsSchema,
  type AppSettings,
  type AppSettingsBranding,
  type AppSettingsSectionId,
  type UpdateAppSettings,
} from '@vortex/types';

import { ActivityService } from '../activity/activity.service.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsUploadService, type UploadedFile } from './settings-upload.service.js';

const defaultSettings: AppSettings = appSettingsSchema.parse({});

export interface SettingsChangeDescription {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  message: string;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly activityService: ActivityService,
    private readonly uploadService: SettingsUploadService,
  ) {}

  async get(): Promise<AppSettings> {
    const stored = await this.repository.get();
    return appSettingsSchema.parse(mergeSettingsDefaults(stored));
  }

  async update(userId: string, patch: UpdateAppSettings): Promise<AppSettings> {
    const current = await this.get();
    const next = appSettingsSchema.parse(mergeSettingsPatch(current, patch));
    const saved = await this.repository.upsert(next);

    for (const [section, values] of Object.entries(patch)) {
      if (!values) continue;
      const changes = this.describeChanges(
        section as AppSettingsSectionId,
        current[section as AppSettingsSectionId],
        values,
      );
      for (const change of changes) {
        await this.activityService.record(userId, {
          action: 'settings.updated',
          resourceType: 'settings',
          resourceId: section,
          type: `settings.${section}.updated`,
          message: change.message,
          oldValue: change.oldValue,
          newValue: change.newValue,
          metadata: { section, field: change.field },
        });
      }
    }

    return saved;
  }

  async updateSection(userId: string, section: AppSettingsSectionId, patch: Record<string, unknown>): Promise<AppSettings> {
    const current = await this.get();
    const sectionSchema = appSettingsSchema.shape[section];
    const nextSection = sectionSchema.parse({ ...current[section], ...patch });
    const next = appSettingsSchema.parse({ ...current, [section]: nextSection });
    const saved = await this.repository.upsert(next);

    const changes = this.describeChanges(section, current[section], patch);
    for (const change of changes) {
      await this.activityService.record(userId, {
        action: 'settings.updated',
        resourceType: 'settings',
        resourceId: section,
        type: `settings.${section}.updated`,
        message: change.message,
        oldValue: change.oldValue,
        newValue: change.newValue,
        metadata: { section, field: change.field },
      });
    }

    return saved;
  }

  async uploadBrandingAsset(
    userId: string,
    kind: 'logo' | 'favicon' | 'pwa_icon',
    file: UploadedFile,
  ): Promise<AppSettings> {
    const processed = await this.uploadService.processImage(kind, file);
    const current = await this.get();

    const patch: Partial<AppSettingsBranding> = {};
    if (kind === 'logo') patch.logoUrl = processed.publicUrl;
    else if (kind === 'favicon') patch.faviconUrl = processed.publicUrl;

    const nextBranding = { ...current.branding, ...patch };
    const next = appSettingsSchema.parse({ ...current, branding: nextBranding });
    const saved = await this.repository.upsert(next);

    await this.activityService.record(userId, {
      action: 'settings.asset_uploaded',
      resourceType: 'settings',
      resourceId: 'branding',
      type: `settings.branding.${kind}_uploaded`,
      message: `${kind === 'pwa_icon' ? 'PWA icon' : kind === 'favicon' ? 'Favicon' : 'App logo'} uploaded`,
      newValue: processed.publicUrl,
      metadata: { section: 'branding', kind, width: processed.width, height: processed.height },
    });

    return saved;
  }

  private describeChanges(
    section: AppSettingsSectionId,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
  ): SettingsChangeDescription[] {
    const changes: SettingsChangeDescription[] = [];

    for (const [field, newValue] of Object.entries(newValues)) {
      const oldValue = oldValues[field];
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;

      const message = this.buildChangeMessage(section, field, oldValue, newValue);
      changes.push({ field, oldValue, newValue, message });
    }

    return changes;
  }

  private buildChangeMessage(
    section: AppSettingsSectionId,
    field: string,
    oldValue: unknown,
    newValue: unknown,
  ): string {
    const label = this.formatFieldLabel(field);

    if (section === 'general' && field === 'appName') {
      const previousAppName = typeof oldValue === 'string' ? oldValue : 'Vortex';
      return `App name changed from "${previousAppName}" to "${String(newValue)}"`;
    }
    if (section === 'branding' && (field === 'logoUrl' || field === 'faviconUrl')) {
      return `${label} ${oldValue ? 'updated' : 'set'}`;
    }
    if (section === 'branding' && field === 'primaryColor') {
      return `Primary color changed from "${String(oldValue)}" to "${String(newValue)}"`;
    }
    if (typeof newValue === 'boolean') {
      return `${label} ${newValue ? 'enabled' : 'disabled'}`;
    }

    return `${label} changed from "${String(oldValue)}" to "${String(newValue)}"`;
  }

  private formatFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      appName: 'App name',
      appDescription: 'App description',
      supportUrl: 'Support URL',
      websiteUrl: 'Website URL',
      defaultLanguage: 'Default language',
      logoUrl: 'Logo',
      faviconUrl: 'Favicon',
      primaryColor: 'Primary color',
      theme: 'Theme',
      sidebarVariant: 'Sidebar variant',
      enabled: 'PWA',
      installPromptEnabled: 'PWA install prompt',
      offlineSupportEnabled: 'Offline support',
      shortName: 'PWA short name',
      themeColor: 'Theme color',
      backgroundColor: 'Background color',
      verboseLogging: 'Verbose logging',
      exposePluginApiDocs: 'Plugin API docs',
      requireEmailVerification: 'Email verification',
      sessionDurationHours: 'Session duration',
      discordWebhookUrl: 'Discord webhook',
      enableExperimentalFeatures: 'Experimental features',
      maxGuildsPerUser: 'Max guilds per user',
    };
    return labels[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }
}

function mergeSettingsPatch(current: AppSettings, patch: UpdateAppSettings): AppSettings {
  return appSettingsSchema.parse({
    general: { ...current.general, ...patch.general },
    branding: { ...current.branding, ...patch.branding },
    appearance: { ...current.appearance, ...patch.appearance },
    pwa: { ...current.pwa, ...patch.pwa },
    debug: { ...current.debug, ...patch.debug },
    security: { ...current.security, ...patch.security },
    integrations: { ...current.integrations, ...patch.integrations },
    advanced: { ...current.advanced, ...patch.advanced },
  });
}

function mergeSettingsDefaults(stored: AppSettings | null): AppSettings {
  if (!stored) return defaultSettings;

  return appSettingsSchema.parse({
    general: { ...defaultSettings.general, ...stored.general },
    branding: { ...defaultSettings.branding, ...stored.branding },
    appearance: { ...defaultSettings.appearance, ...stored.appearance },
    pwa: { ...defaultSettings.pwa, ...stored.pwa },
    debug: { ...defaultSettings.debug, ...stored.debug },
    security: { ...defaultSettings.security, ...stored.security },
    integrations: { ...defaultSettings.integrations, ...stored.integrations },
    advanced: { ...defaultSettings.advanced, ...stored.advanced },
  });
}
