import { describe, expect, it } from 'vitest';

import { VisualLayoutCodec } from './visual-layout.js';

describe('VisualLayoutCodec', () => {
  it('round-trips validated editor JSON', () => {
    const codec = new VisualLayoutCodec();
    const layout = {
      version: 1 as const,
      width: 1_200,
      height: 400,
      backgroundColor: '#111827',
      elements: [
        {
          id: 'headline',
          type: 'text' as const,
          x: 40,
          y: 40,
          width: 400,
          height: 80,
          rotation: 0,
          opacity: 1,
          text: 'Hello [userName]',
          fontFamily: 'Arial',
          fontSize: 48,
          fill: '#ffffff',
        },
      ],
    };

    expect(codec.import(codec.export(layout))).toEqual(layout);
  });

  it('rejects malformed imported layouts', () => {
    expect(() => new VisualLayoutCodec().import('{"version":1,"width":0}')).toThrow();
  });
});
