import type { PermissionRole } from '@vortex/types';

const ADMINISTRATOR_PERMISSION = 1n << 3n;
const MANAGE_GUILD_PERMISSION = 1n << 5n;

export interface GuildPermissionState {
  canManage: boolean;
  isOwner: boolean;
  hasAdmin: boolean;
  hasManager: boolean;
  permissionRole: PermissionRole | null;
}

export function getGuildPermissionState(
  isOwner: boolean,
  permissions: string,
): GuildPermissionState {
  if (isOwner) {
    return createPermissionState('OWNER');
  }

  const permissionBits = BigInt(permissions);
  if (hasPermission(permissionBits, ADMINISTRATOR_PERMISSION)) {
    return createPermissionState('ADMINISTRATOR');
  }
  if (hasPermission(permissionBits, MANAGE_GUILD_PERMISSION)) {
    return createPermissionState('MANAGER');
  }
  return createPermissionState(null);
}

function createPermissionState(permissionRole: PermissionRole | null): GuildPermissionState {
  return {
    canManage: permissionRole !== null,
    isOwner: permissionRole === 'OWNER',
    hasAdmin: permissionRole === 'ADMINISTRATOR',
    hasManager: permissionRole === 'MANAGER',
    permissionRole,
  };
}

function hasPermission(permissionBits: bigint, permission: bigint): boolean {
  return (permissionBits & permission) === permission;
}
