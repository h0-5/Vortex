import { describe, expect, it } from 'vitest';

import { getDiscordSnowflakeCreatedAt, isDiscordSnowflake } from './discord.js';

describe('Discord snowflakes', () => {
  it('accepts a valid Discord snowflake', () => {
    expect(isDiscordSnowflake('175928847299117063')).toBe(true);
  });

  it('extracts the creation timestamp', () => {
    expect(getDiscordSnowflakeCreatedAt('175928847299117063').toISOString()).toBe(
      '2016-04-30T11:18:25.796Z',
    );
  });
});
