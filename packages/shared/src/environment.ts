import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']).default('development');
const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info');
const snowflakeSchema = z.string().regex(/^\d{17,20}$/);

const baseEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  DATABASE_URL: z.string().url().refine(
    (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
    'DATABASE_URL must start with postgresql:// or postgres://',
  ),
  LOG_LEVEL: logLevelSchema,
});

export const apiEnvironmentSchema = baseEnvironmentSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(4000),
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32).optional(),
  OAUTH_TOKEN_ENCRYPTION_KEY: z.string().refine(isBase64Encoded32ByteKey, {
    message: 'OAUTH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
  }),
  DISCORD_CLIENT_ID: snowflakeSchema,
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_REDIRECT_URI: z.url(),
  DASHBOARD_URL: z.url(),
});

export const botEnvironmentSchema = baseEnvironmentSchema.extend({
  DISCORD_BOT_TOKEN: z.string().min(1),
  COMMAND_PREFIX: z.string().min(1).max(10).default('!'),
  DISCORD_GUILD_MEMBERS_INTENT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DISCORD_MESSAGE_CONTENT_INTENT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;
export type BotEnvironment = z.infer<typeof botEnvironmentSchema>;

export function parseApiEnvironment(environment: NodeJS.ProcessEnv): ApiEnvironment {
  return apiEnvironmentSchema.parse(environment);
}

export function parseBotEnvironment(environment: NodeJS.ProcessEnv): BotEnvironment {
  return botEnvironmentSchema.parse(environment);
}

function isBase64Encoded32ByteKey(value: string): boolean {
  try {
    return Buffer.from(value, 'base64').length === 32;
  } catch {
    return false;
  }
}
