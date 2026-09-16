import { describe, expect, it } from 'vitest';

import { pluginLogSettingsSchema, pluginTemplateSchema } from '@vortex/types';

import { toLogSettings, toTemplate } from './plugin-core.repository.js';

describe('PluginCoreRepository mappers', () => {
  it('maps plugin template rows without leaking createdAt', () => {
    const row = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      guildId: '1111111111111111111',
      pluginId: 'test-plugin',
      name: 'Default Template',
      type: 'default',
      contentMode: 'text' as const,
      content: { type: 'text' as const, content: 'Hello [userName]!' },
      variables: ['[userName]'],
      previewData: { userName: 'Alice' },
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-06-01T00:00:00Z'),
    };

    const template = toTemplate(row, 3);

    expect(template).not.toHaveProperty('createdAt');
    expect(template.version).toBe(3);
    expect(pluginTemplateSchema.parse(template)).toEqual(template);
  });

  it('maps plugin log settings rows without leaking createdAt', () => {
    const row = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      guildId: '1111111111111111111',
      pluginId: 'test-plugin',
      destination: 'DASHBOARD' as const,
      channelId: null,
      outputType: 'text' as const,
      embedColor: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-06-01T00:00:00Z'),
    };

    const settings = toLogSettings(row);

    expect(settings).not.toHaveProperty('createdAt');
    expect(settings).not.toHaveProperty('id');
    expect(pluginLogSettingsSchema.parse(settings)).toEqual(settings);
  });
});
