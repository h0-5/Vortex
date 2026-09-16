export type PluginAuditEventType =
  | 'BAN_ADD'
  | 'KICK'
  | 'BOT_ADD'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_DELETE'
  | 'ROLE_CREATE'
  | 'ROLE_DELETE'
  | 'WEBHOOK_CREATE';

export interface PluginMemberRecord {
  userId: string;
  roleIds: string[];
  isBot: boolean;
  displayName: string;
}

export interface PluginAuditRecord {
  executorId: string | null;
  targetId: string | null;
  reason: string | null;
  createdAt: string | null;
}

export interface PluginWebhookRecord {
  id: string;
  ownerId: string | null;
  name: string | null;
}

export interface PluginUserRecord {
  userId: string;
  username: string;
  displayName: string;
  discriminator: string | null;
  isBot: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  createdAt: string | null;
}

export interface PluginRoleRecord {
  id: string;
  name: string;
  color: number;
  position: number;
  mentionable: boolean;
  hoist: boolean;
  isManaged: boolean;
}

export interface PluginGuildInfo {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  premiumTier: number;
  boostCount: number;
  iconUrl: string | null;
  bannerUrl: string | null;
  ownerId: string | null;
  createdAt: string | null;
}

export interface PluginGuild {
  getBotUserId(): Promise<string | null>;
  fetchMember(userId: string): Promise<PluginMemberRecord | null>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
  fetchAudit(eventType: PluginAuditEventType): Promise<PluginAuditRecord | null>;
  fetchUser(userId: string): Promise<PluginUserRecord | null>;
  fetchRoles(): Promise<PluginRoleRecord[]>;
  fetchGuildInfo(): Promise<PluginGuildInfo | null>;
  timeout(userId: string, milliseconds: number | null, reason?: string): Promise<boolean>;
  moveVoiceMember(userId: string, channelId: string): Promise<boolean>;
  kick(userId: string, reason?: string): Promise<boolean>;
  ban(userId: string, reason?: string, deleteMessageDays?: number): Promise<boolean>;
  unban(userId: string, reason?: string): Promise<boolean>;
  setRoles(userId: string, roleIds: string[]): Promise<boolean>;
  addRole(userId: string, roleId: string): Promise<boolean>;
  removeRole(userId: string, roleId: string): Promise<boolean>;
  deleteRole(roleId: string, reason?: string): Promise<boolean>;
  fetchWebhooks(channelId: string): Promise<PluginWebhookRecord[]>;
  deleteWebhook(webhookId: string, reason?: string): Promise<boolean>;
}