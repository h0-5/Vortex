import { describe, expect, it } from 'vitest';

import { getGuildPermissionState } from './guild-permissions.js';

describe('getGuildPermissionState', () => {
  it('gives guild owners the owner state', () => {
    expect(getGuildPermissionState(true, '0')).toEqual({
      canManage: true,
      isOwner: true,
      hasAdmin: false,
      hasManager: false,
      permissionRole: 'OWNER',
    });
  });

  it('recognizes the Discord administrator permission bit', () => {
    expect(getGuildPermissionState(false, '8')).toEqual({
      canManage: true,
      isOwner: false,
      hasAdmin: true,
      hasManager: false,
      permissionRole: 'ADMINISTRATOR',
    });
  });

  it('recognizes the Discord manage guild permission bit', () => {
    expect(getGuildPermissionState(false, '32')).toEqual({
      canManage: true,
      isOwner: false,
      hasAdmin: false,
      hasManager: true,
      permissionRole: 'MANAGER',
    });
  });

  it('does not grant access without a management permission', () => {
    expect(getGuildPermissionState(false, '1024')).toEqual({
      canManage: false,
      isOwner: false,
      hasAdmin: false,
      hasManager: false,
      permissionRole: null,
    });
  });
});
