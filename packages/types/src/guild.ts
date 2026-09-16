import { z } from 'zod';

export const permissionRoleSchema = z.enum(['OWNER', 'ADMINISTRATOR', 'MANAGER']);
export const guildActionSchema = z.enum(['manage', 'add_bot']);

export const guildSummarySchema = z.object({
  id: z.string().regex(/^\d{17,20}$/),
  name: z.string().min(1),
  icon: z.string().nullable(),
  memberCount: z.number().int().nullable(),
  canManage: z.boolean(),
  isOwner: z.boolean(),
  hasAdmin: z.boolean(),
  hasManager: z.boolean(),
  botConnected: z.boolean(),
  action: guildActionSchema.nullable(),
  permissionRole: permissionRoleSchema.nullable(),
});

export const guildDetailSchema = guildSummarySchema;
export const guildListResponseSchema = z.object({
  data: z.array(guildSummarySchema),
});

export type PermissionRole = z.infer<typeof permissionRoleSchema>;
export type GuildAction = z.infer<typeof guildActionSchema>;
export type GuildSummary = z.infer<typeof guildSummarySchema>;
export type GuildDetail = z.infer<typeof guildDetailSchema>;
export type GuildListResponse = z.infer<typeof guildListResponseSchema>;
