export interface PluginMember {
  userId: string;
  roleIds: string[];
}

export interface PluginPermissions {
  canManagePlugin(userId: string): Promise<boolean>;
  canRunCommand(commandId: string, member: PluginMember, channelId: string): Promise<boolean>;
}
