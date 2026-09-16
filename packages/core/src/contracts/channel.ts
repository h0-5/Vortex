export interface PluginPermissionOverride {
  id: string;
  type: 'role' | 'member';
  allow: bigint | number;
  deny: bigint | number;
}

export interface PluginChannelCreateOptions {
  name: string;
  categoryId?: string;
  topic?: string;
  permissionOverrides?: PluginPermissionOverride[];
  reason?: string;
}

export interface PluginThreadCreateOptions {
  name: string;
  invitable?: boolean;
  reason?: string;
  memberIds?: string[];
}

export interface PluginChannel {
  id: string;
  guildId: string;
  name: string;
  type: string;
}

export interface PluginChannels {
  createText(options: PluginChannelCreateOptions): Promise<PluginChannel>;
  createPrivateThread(parentChannelId: string, options: PluginThreadCreateOptions): Promise<PluginChannel | null>;
  addThreadMember(threadId: string, userId: string): Promise<boolean>;
  createCategory(name: string): Promise<PluginChannel>;
  setPermissions(
    channelId: string,
    overrides: PluginPermissionOverride[],
    reason?: string,
  ): Promise<void>;
  setTopic(channelId: string, topic: string | null): Promise<void>;
  moveToCategory(channelId: string, categoryId: string | null): Promise<void>;
  delete(channelId: string, reason?: string): Promise<void>;
  rename(channelId: string, name: string): Promise<void>;
  setSlowmode(channelId: string, seconds: number, reason?: string): Promise<void>;
}