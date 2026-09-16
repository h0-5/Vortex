import { z } from 'zod';

export const userSchema = z.object({
  id: z.uuid(),
  discordId: z.string().regex(/^\d{17,20}$/),
  username: z.string().min(1),
  avatar: z.string().nullable(),
  globalName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;
