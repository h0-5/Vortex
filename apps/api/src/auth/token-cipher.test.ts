import { describe, expect, it } from 'vitest';

import { TokenCipher } from './token-cipher.js';

describe('TokenCipher', () => {
  it('encrypts and decrypts OAuth tokens', () => {
    const cipher = new TokenCipher({
      OAUTH_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    } as never);

    const encrypted = cipher.encrypt('discord-access-token');

    expect(encrypted.ciphertext).not.toBe('discord-access-token');
    expect(cipher.decrypt(encrypted)).toBe('discord-access-token');
  });
});
