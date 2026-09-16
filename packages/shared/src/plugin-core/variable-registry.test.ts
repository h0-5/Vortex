import { describe, expect, it } from 'vitest';

import { VariableRegistry } from './variable-registry.js';

describe('VariableRegistry', () => {
  it('replaces registered variables', () => {
    const registry = new VariableRegistry();
    expect(
      registry.resolve('[user] joined [serverName].', {
        user: '<@123>',
        serverName: 'Vortex',
      }),
    ).toBe('<@123> joined Vortex.');
  });

  it('keeps or clears missing variables without throwing', () => {
    const registry = new VariableRegistry();
    expect(registry.resolve('Hello [inviterName]', {})).toBe('Hello [inviterName]');
    expect(registry.resolve('Hello [inviterName]', {}, { missing: 'empty' })).toBe('Hello ');
  });

  it('allows plugins to register custom variables', () => {
    const registry = new VariableRegistry();
    registry.register('inviteCodeFormatted', (data) => `**${data.inviteCode}**`);

    expect(
      registry.resolve('Join with [inviteCodeFormatted]', {
        inviteCode: 'abc123',
      }),
    ).toBe('Join with **abc123**');
  });

  it('prevents duplicate variable registration', () => {
    const registry = new VariableRegistry();
    registry.register('customVar', () => 'first');

    expect(() => registry.register('customVar', () => 'second')).toThrow(/already registered/);
  });

  it('rejects invalid variable names', () => {
    const registry = new VariableRegistry();

    expect(() => registry.register('', () => 'x')).toThrow();
    expect(() => registry.register('123invalid', () => 'x')).toThrow();
    expect(() => registry.register('invalid-name', () => 'x')).toThrow();
  });

  it('cannot override built-in variables', () => {
    const registry = new VariableRegistry();

    expect(() => registry.register('userName', () => 'override')).toThrow(/already registered/);
  });

  it('resolves content with custom and built-in variables', () => {
    const registry = new VariableRegistry();
    registry.register('customGreeting', (data) => `Hello, ${data.userName}!`);

    const result = registry.resolve('[customGreeting] You are on [serverName].', {
      userName: 'Alice',
      serverName: 'Vortex',
    });

    expect(result).toBe('Hello, Alice! You are on Vortex.');
  });
});
