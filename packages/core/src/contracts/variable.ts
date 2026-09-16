export interface VariableResolveOptions {
  missing?: 'keep' | 'empty';
}

export interface PluginVariables {
  register(name: string, resolver: (data: Record<string, string>) => string | undefined): void;
  resolve(content: string, data: Record<string, string>, options?: VariableResolveOptions): string;
}
