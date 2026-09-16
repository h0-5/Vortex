import { describe, expect, it } from 'vitest';

import { pluginComponents, pluginEmbeds, pluginMessages } from './message-builder.js';
import { validateTemplate } from './template-registry.js';

describe('message and template validation', () => {
  it('validates a template against its declared mode', () => {
    expect(() =>
      validateTemplate({
        name: 'Audit output',
        type: 'audit',
        contentMode: 'text',
        content: { type: 'text', content: 'Actor: [user]' },
      }),
    ).not.toThrow();
  });

  it('allows embed colors', () => {
    expect(pluginEmbeds.build({ description: 'Status', color: 0x5865f2, fields: [] }).color).toBe(
      0x5865f2,
    );
  });

  it('rejects color on Components V2 output', () => {
    expect(() =>
      pluginMessages.build({
        type: 'components_v2',
        color: 0x5865f2,
        components: [
          {
            type: 'container',
            items: [{ type: 'text_display', content: 'Status' }],
          },
        ],
      }),
    ).toThrow();
  });

  it('builds valid Components V2 output', () => {
    expect(
      pluginComponents.build({
        components: [
          {
            type: 'container',
            items: [{ type: 'text_display', content: 'Status' }],
          },
        ],
      }).type,
    ).toBe('components_v2');
  });
});
