import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string): string {
  return readFileSync(join(sourceRoot, relativePath), 'utf8');
}

function walkSourceFiles(dir: string, callback: (path: string) => void, exclude?: Set<string>): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(fullPath, callback, exclude);
      continue;
    }
    if (!entry.name.endsWith('.ts')) {
      continue;
    }
    if (exclude?.has(relative(sourceRoot, fullPath))) {
      continue;
    }
    callback(fullPath);
  }
}

const FORBIDDEN_WELCOME_STRINGS = [
  'welcomeChannelId',
  'welcomeMessage',
  'dmWelcome',
  'leaveSettings',
  'inviteTracking',
  'Default Welcome',
  'Welcome messages',
  'Enable welcome messages',
  'Send test welcome message',
  'Welcome plugin logs',
  'Welcome [user]',
  'Welcome [userName]',
  'welcome_settings',
  'welcome_templates',
  'welcome_invite_cache',
  'welcome_delivery_logs',
];

const EXCLUDED_CORE_PATHS = new Set([
  'architecture.test.ts',
  'official-plugin.registry.ts',
]);

describe('API Core architecture boundaries', () => {
  it('does not contain Welcome-specific settings or logic in Core source', () => {
    const violations: string[] = [];
    walkSourceFiles(
      sourceRoot,
      (filePath) => {
        const source = readFileSync(filePath, 'utf8');
        const relativePath = relative(sourceRoot, filePath);
        for (const term of FORBIDDEN_WELCOME_STRINGS) {
          if (source.includes(term)) {
            violations.push(`${relativePath}: ${term}`);
          }
        }
      },
      EXCLUDED_CORE_PATHS,
    );
    expect(violations).toEqual([]);
  });

  it('does not expose Welcome-specific REST endpoints', () => {
    const controllerSource = readSource('plugins/plugins.controller.ts');
    expect(controllerSource).not.toContain("'/welcome");
    expect(controllerSource).not.toContain('welcome/');
    expect(controllerSource).not.toContain('welcome_');
  });

  it('uses generic plugin endpoints for storage, templates, and commands', () => {
    const controllerSource = readSource('plugins/plugins.controller.ts');
    expect(controllerSource).toContain("':pluginId/storage/:key'");
    expect(controllerSource).toContain("':pluginId/templates'");
    expect(controllerSource).toContain("':pluginId/commands'");
    expect(controllerSource).toContain("':pluginId/templates/:name/test'");
  });

  it('keeps OfficialPluginRegistry as metadata-only and does not embed Welcome UI', () => {
    const registrySource = readSource('plugins/official-plugin.registry.ts');
    expect(registrySource).toContain("id: 'welcome'");
    expect(registrySource).not.toContain('Welcome messages');
    expect(registrySource).not.toContain('Enable welcome messages');
    expect(registrySource).not.toContain('Default Welcome');
    expect(registrySource).not.toContain('Welcome [user]');
    expect(registrySource).not.toContain('"tabs"');
    expect(registrySource).not.toContain('schemaFallback');
  });

  it('stores the Logs dashboard schema inside the Logs plugin package', () => {
    const schemaPath = join(sourceRoot, '..', '..', '..', 'plugins', 'logs', 'dashboard.schema.json');
    expect(existsSync(schemaPath)).toBe(true);
    const schema = readFileSync(schemaPath, 'utf8');
    expect(schema).toContain('"contentMode": "schema"');
    expect(schema).toContain('"id": "overview"');
    expect(schema).toContain('"id": "settings"');
  });

  it('keeps Logs plugin actions inside the Logs plugin package', () => {
    const pluginDir = join(sourceRoot, '..', '..', '..', 'plugins', 'logs');
    expect(existsSync(join(pluginDir, 'plugin.json'))).toBe(true);
    expect(existsSync(join(pluginDir, 'index.ts'))).toBe(true);
  });

  it('does not ship Welcome plugin source in the repository', () => {
    const welcomeDir = join(sourceRoot, '..', '..', '..', 'plugins', 'welcome');
    expect(existsSync(welcomeDir)).toBe(false);
  });

  it('does not have Welcome-specific database tables or migrations in Core', () => {
    const schemaSource = readSource('../../../packages/database/src/schema.ts');
    expect(schemaSource).not.toContain('welcome_settings');
    expect(schemaSource).not.toContain('welcome_templates');
    expect(schemaSource).not.toContain('welcome_invite_cache');
    expect(schemaSource).not.toContain('welcome_delivery_logs');
  });
});
