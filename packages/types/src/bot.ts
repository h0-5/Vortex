import { z } from 'zod';

export const botProfileSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
    avatarUrl: z.string().nullable(),
    discriminator: z.string().nullable(),
  })
  .strict();

export type BotProfile = z.infer<typeof botProfileSchema>;

export const testTemplateSchema = z
  .object({
    templateName: z.string().min(1).max(100),
    channelId: z.string().min(1).max(64).optional(),
    userId: z.string().min(1).max(64).optional(),
    variables: z.record(z.string(), z.string()).default({}),
  })
  .strict()
  .refine((data) => Boolean(data.channelId) !== Boolean(data.userId), {
    message: 'Provide either channelId or userId, not both.',
    path: ['channelId'],
  });

export type TestTemplate = z.infer<typeof testTemplateSchema>;

export const pluginTestResultSchema = z
  .object({
    success: z.boolean(),
    messageId: z.string().nullable(),
    channelId: z.string().nullable(),
  })
  .strict();

export type PluginTestResult = z.infer<typeof pluginTestResultSchema>;
