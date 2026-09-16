import { z } from 'zod';

export const discordCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type DiscordCallbackQuery = z.infer<typeof discordCallbackQuerySchema>;
