import type { PluginVariables, VariableResolveOptions } from '../plugin-contracts.js';

type VariableResolver = (data: Record<string, string>) => string | undefined;

const initialVariables = [
  'user',
  'userName',
  'userCreatedDate',
  'userCreatedDays',
  'serverName',
  'memberCount',
  'inviter',
  'inviterName',
  'invitesCount',
  'inviteCode',
] as const;

export class VariableRegistry implements PluginVariables {
  private readonly resolvers = new Map<string, VariableResolver>();

  constructor() {
    for (const variable of initialVariables) {
      this.resolvers.set(variable, (data) => data[variable]);
    }
  }

  register(name: string, resolver: VariableResolver): void {
    assertVariableName(name);
    if (this.resolvers.has(name)) {
      throw new Error(`Variable [${name}] is already registered.`);
    }
    this.resolvers.set(name, resolver);
  }

  resolve(
    content: string,
    data: Record<string, string>,
    options: VariableResolveOptions = {},
  ): string {
    return content.replace(/\[([A-Za-z][A-Za-z0-9_]*)\]/g, (placeholder, name: string) => {
      const value = this.resolvers.get(name)?.(data);
      if (value !== undefined) {
        return value;
      }
      return options.missing === 'empty' ? '' : placeholder;
    });
  }
}

function assertVariableName(name: string): void {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)) {
    throw new Error(
      'Variable names must start with a letter and contain only letters, digits, or _.',
    );
  }
}
