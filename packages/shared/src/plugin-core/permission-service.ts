import type {
  CommandConfigurationReader,
  PluginManagementReader,
  PluginMember,
  PluginPermissions,
  PluginScope,
} from '../plugin-contracts.js';

export class ScopedPluginPermissions implements PluginPermissions {
  constructor(
    private readonly scope: PluginScope,
    private readonly managementReader: PluginManagementReader,
    private readonly commandReader: CommandConfigurationReader,
  ) {}

  canManagePlugin(userId: string): Promise<boolean> {
    return this.managementReader.canManage(this.scope, userId);
  }

  async canRunCommand(
    commandId: string,
    member: PluginMember,
    channelId: string,
  ): Promise<boolean> {
    const config = await this.commandReader.getPermissions(this.scope, commandId);
    if (config.ignoredChannelIds.includes(channelId)) {
      return false;
    }
    if (config.enabledChannelIds.length > 0 && !config.enabledChannelIds.includes(channelId)) {
      return false;
    }
    if (member.roleIds.some((roleId) => config.ignoredRoleIds.includes(roleId))) {
      return false;
    }
    return (
      config.allowedRoleIds.length === 0 ||
      member.roleIds.some((roleId) => config.allowedRoleIds.includes(roleId))
    );
  }
}
