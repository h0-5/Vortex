import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import type { ApiEnvironment } from '@vortex/shared';

import { API_ENVIRONMENT } from '../config/tokens.js';

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class TokenCipher {
  private readonly key: Buffer;

  constructor(@Inject(API_ENVIRONMENT) environment: ApiEnvironment) {
    this.key = Buffer.from(environment.OAUTH_TOKEN_ENCRYPTION_KEY, 'base64');
  }

  encrypt(plaintext: string): EncryptedToken {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return {
      ciphertext: ciphertext.toString('base64url'),
      iv: iv.toString('base64url'),
      authTag: cipher.getAuthTag().toString('base64url'),
    };
  }

  decrypt(token: EncryptedToken): string {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(token.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(token.authTag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(token.ciphertext, 'base64url')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
