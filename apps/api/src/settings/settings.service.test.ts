import { describe, expect, it, vi } from 'vitest';

import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  function createService(repository: { get: () => unknown; upsert: (value: unknown) => unknown }) {
    const activityService = { record: vi.fn().mockResolvedValue(undefined) };
    const uploadService = { uploadsDir: '/tmp/uploads', upload: vi.fn().mockResolvedValue({ path: '/tmp/uploads/file.png' }) };
    const service = new SettingsService(repository as never, activityService as never, uploadService as never);
    return { service, activityService, uploadService };
  }

  it('returns default settings when none are stored', async () => {
    const { service } = createService({ get: vi.fn().mockResolvedValue(null), upsert: vi.fn() });

    const settings = await service.get();

    expect(settings.general.appName).toBe('Vortex');
    expect(settings.appearance.theme).toBe('system');
  });

  it('merges partial updates and persists the full settings object', async () => {
    const { service } = createService({
      get: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(async (value) => value),
    });

    const updated = await service.update('user-1', {
      general: { appName: 'Vortex Pro', supportUrl: null, defaultLanguage: 'en' },
    });

    expect(updated.general.appName).toBe('Vortex Pro');
    expect(updated.branding.primaryColor).toBe('#5865f2');
  });

  it('updateSection persists a single section and returns full settings', async () => {
    const { service } = createService({
      get: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(async (value) => value),
    });

    const updated = await service.updateSection('user-1', 'general', { appName: 'Code Nexus' });

    expect(updated.general.appName).toBe('Code Nexus');
  });

  it('rejects invalid settings values', async () => {
    const { service } = createService({ get: vi.fn().mockResolvedValue(null), upsert: vi.fn() });

    await expect(
      service.update('user-1', {
        security: { requireEmailVerification: false, sessionDurationHours: 0 },
      }),
    ).rejects.toThrow();
  });

  it('records meaningful activity when app name changes', async () => {
    const { service, activityService } = createService({
      get: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(async (value) => value),
    });

    await service.updateSection('user-1', 'general', { appName: 'Code Nexus' });

    expect(activityService.record).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        action: 'settings.updated',
        resourceType: 'settings',
        resourceId: 'general',
        message: 'App name changed from "Vortex" to "Code Nexus"',
      }),
    );
  });

  it('records toggle activity when boolean setting changes', async () => {
    const { service, activityService } = createService({
      get: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(async (value) => value),
    });

    await service.updateSection('user-1', 'debug', { verboseLogging: true });

    expect(activityService.record).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        action: 'settings.updated',
        message: 'Verbose logging enabled',
      }),
    );
  });
});
