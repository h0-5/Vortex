import { describe, expect, it } from 'vitest';

import { ScopedPluginPermissions } from './permission-service.js';
import { createPermissionReaders, scope } from './test-helpers.js';

describe('ScopedPluginPermissions', () => {
  it('applies allowed roles and channel rules centrally', async () => {
    const readers = createPermissionReaders({
      allowedRoleIds: ['42345678901234567'],
      ignoredRoleIds: [],
      ignoredChannelIds: [],
      enabledChannelIds: ['52345678901234567'],
    });
    const service = new ScopedPluginPermissions(scope, readers.management, readers.commands);

    await expect(
      service.canRunCommand(
        'status',
        { userId: '32345678901234567', roleIds: ['42345678901234567'] },
        '52345678901234567',
      ),
    ).resolves.toBe(true);
    await expect(
      service.canRunCommand(
        'status',
        { userId: '32345678901234567', roleIds: [] },
        '52345678901234567',
      ),
    ).resolves.toBe(false);
  });

  it('makes ignored roles and channels deny first', async () => {
    const readers = createPermissionReaders({
      allowedRoleIds: ['42345678901234567'],
      ignoredRoleIds: ['42345678901234567'],
      ignoredChannelIds: ['52345678901234567'],
      enabledChannelIds: ['52345678901234567'],
    });
    const service = new ScopedPluginPermissions(scope, readers.management, readers.commands);

    await expect(
      service.canRunCommand(
        'status',
        { userId: '32345678901234567', roleIds: ['42345678901234567'] },
        '52345678901234567',
      ),
    ).resolves.toBe(false);
  });
});
