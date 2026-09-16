import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import AdmZip from 'adm-zip';
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type { PluginManifest } from '@vortex/types';
import { pluginDashboardSchemaDocumentSchema } from '@vortex/types';
import semver from 'semver';

import { OfficialPluginRegistry } from './official-plugin.registry.js';
import { PluginDiscoveryService } from './plugin-discovery.service.js';
import { PluginManager } from './plugin-manager.service.js';
import { PluginMigrationService } from './plugin-migration.service.js';
import { PluginOperationException } from './plugin-operation.exception.js';
import { PluginRepository } from './plugin.repository.js';

const ALLOWED_PLUGIN_ID = /^[a-z0-9-_]+$/u;
const RESERVED_PLUGIN_IDS = new Set([
  'core',
  'system',
  'vortex',
  'api',
  'dashboard',
  'bot',
  'database',
  'shared',
  'types',
  'ui',
  'node_modules',
  'installed',
]);
const MAX_PLUGIN_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Injectable()
export class PluginUploadService {
  private readonly logger = new Logger(PluginUploadService.name);

  constructor(
    private readonly pluginDiscoveryService: PluginDiscoveryService,
    private readonly pluginManager: PluginManager,
    private readonly pluginRepository: PluginRepository,
    private readonly pluginMigrationService: PluginMigrationService,
    private readonly officialPluginRegistry: OfficialPluginRegistry,
  ) {}

  async upload(file: MulterFile, guildId: string): Promise<PluginManifest> {
    if (!file?.path) {
      throw new PluginOperationException(
        'PLUGIN_UPLOAD_FILE_MISSING',
        'No plugin archive file was received.',
        400,
      );
    }
    this.validateArchiveFile(file);

    const tempDir = join(dirname(file.path), `extract-${Date.now()}`);
    try {
      await this.extractArchive(file.path, tempDir);
      await this.validateFileTree(tempDir);
      const sourceDir = await this.findPluginRoot(tempDir);

      const manifest = await this.readAndValidateManifest(sourceDir);
      await this.validateDashboardContent(sourceDir, manifest);
      const targetDir = this.getInstalledPluginDirectory(manifest.id);

      await this.ensureSafeInstall(targetDir, manifest);
      await this.copyPluginFiles(sourceDir, targetDir);
      await this.registerPlugin(manifest, guildId);
      await this.pluginMigrationService.apply([manifest]);
      await this.pluginManager.reloadManifests();

      return manifest;
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      await rm(file.path, { force: true }).catch(() => {});
    }
  }

  private validateArchiveFile(file: MulterFile): void {
    if (!file) {
      throw new BadRequestException('No plugin archive was provided.');
    }

    if (file.size > MAX_PLUGIN_SIZE_BYTES) {
      throw new BadRequestException(
        `Plugin archive exceeds the maximum size of ${MAX_PLUGIN_SIZE_BYTES / 1024 / 1024} MB.`,
      );
    }

    const extension = file.originalname.toLowerCase().split('.').pop();
    if (extension !== 'vortex' && extension !== 'codenexus') {
      throw new BadRequestException(
        'Plugin archive must be a .vortex or .codenexus file.',
      );
    }
  }

  private async extractArchive(archivePath: string, targetDir: string): Promise<void> {
    try {
      await mkdir(targetDir, { recursive: true });
      const zip = new AdmZip(archivePath);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (entry.isDirectory) continue;

        if (isUnsafeArchiveEntry(entry.entryName)) {
          throw new BadRequestException('Plugin archive contains unsafe file paths.');
        }

        if (entry.header.size > MAX_FILE_SIZE_BYTES) {
          throw new BadRequestException(
            `File ${entry.entryName} exceeds the maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
          );
        }
      }

      zip.extractAllTo(targetDir, true);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to extract plugin archive.');
    }
  }

  private async findPluginRoot(tempDir: string): Promise<string> {
    const manifests = await this.findFilesNamed(tempDir, 'plugin.json');

    if (manifests.length === 1) {
      return dirname(manifests[0]!);
    }

    if (manifests.length > 1) {
      throw new BadRequestException('Plugin archive contains multiple plugin.json manifests.');
    }

    throw new BadRequestException('Plugin archive is missing plugin.json manifest.');
  }

  private async findFilesNamed(root: string, filename: string): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const matches: string[] = [];

    for (const entry of entries) {
      const fullPath = join(root, entry.name);
      if (entry.isDirectory()) {
        matches.push(...(await this.findFilesNamed(fullPath, filename)));
      } else if (entry.name === filename) {
        matches.push(fullPath);
      }
    }

    return matches;
  }

  private async validateFileTree(sourceDir: string): Promise<void> {
    const walk = async (dir: string): Promise<string[]> => {
      const entries = await readdir(dir, { withFileTypes: true });
      const paths: string[] = [];
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = normalize(fullPath.slice(sourceDir.length + 1));
        if (entry.isDirectory()) {
          paths.push(...(await walk(fullPath)));
        } else {
          paths.push(relativePath);
        }
      }
      return paths;
    };

    const files = await walk(sourceDir);

    for (const file of files) {
      if (file.includes('..') || file.startsWith('/') || file.startsWith('\\')) {
        throw new BadRequestException(`Unsafe path detected: ${file}`);
      }

      const lower = file.toLowerCase();
      const parts = lower.split(/[/\\]/u);

      if (parts.includes('.env') || parts.some((part) => part.startsWith('.env.'))) {
        throw new BadRequestException(`Plugin archive must not contain .env files: ${file}`);
      }
      if (parts.includes('node_modules')) {
        throw new BadRequestException(`Plugin archive must not contain node_modules: ${file}`);
      }
      if (parts.includes('.git')) {
        throw new BadRequestException(`Plugin archive must not contain .git: ${file}`);
      }
      if (/\.(sh|bat|cmd|exe|dll|so|dylib)$/iu.test(file)) {
        throw new BadRequestException(`Plugin archive must not contain executables: ${file}`);
      }
    }
  }

  private async readAndValidateManifest(sourceDir: string): Promise<PluginManifest> {
    const manifestPath = join(sourceDir, 'plugin.json');
    let raw: string;
    try {
      raw = await readFile(manifestPath, 'utf8');
    } catch {
      throw new BadRequestException('Plugin archive is missing plugin.json manifest.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('plugin.json is not valid JSON.');
    }

    const manifest = this.pluginDiscoveryService.validateManifest(parsed);

    if (!ALLOWED_PLUGIN_ID.test(manifest.id)) {
      throw new BadRequestException(
        `Plugin ID "${manifest.id}" contains unsafe characters. Use only lowercase letters, numbers, hyphens, and underscores.`,
      );
    }

    if (RESERVED_PLUGIN_IDS.has(manifest.id)) {
      throw new BadRequestException(`Plugin ID "${manifest.id}" is reserved.`);
    }

    if (this.officialPluginRegistry.isOfficial(manifest.id) && !this.officialPluginRegistry.isSupported(manifest.id)) {
      throw new PluginOperationException(
        'PLUGIN_UNSUPPORTED_CORE_VERSION',
        `Plugin "${manifest.id}" requires Vortex ${this.officialPluginRegistry.getById(manifest.id)?.minCoreVersion} or newer.`,
        HttpStatus.BAD_REQUEST,
        { pluginId: manifest.id },
      );
    }

    if (!semver.valid(manifest.version)) {
      throw new BadRequestException(`Plugin version "${manifest.version}" is not valid semver.`);
    }

    const entryPath = join(sourceDir, manifest.entry);
    try {
      const entryStat = await stat(entryPath);
      if (!entryStat.isFile()) {
        throw new BadRequestException(`Plugin entry "${manifest.entry}" is not a file.`);
      }
    } catch {
      throw new BadRequestException(`Plugin entry "${manifest.entry}" was not found.`);
    }

    await this.validateRuntimeEntry(sourceDir, manifest);
    this.validatePackageVersionGuard(manifest);

    return manifest;
  }

  private validatePackageVersionGuard(manifest: PluginManifest): void {
    // Reject known outdated Welcome plugin packages that contain old bugs
    // (fake preview variables, missing createContentMap, incomplete variable set)
    if (manifest.id === 'welcome') {
      const metadata = manifest.packageMetadata;
      const packageVersion = metadata?.packageVersion;

      if (!metadata) {
        throw new PluginOperationException(
          'PLUGIN_PACKAGE_OUTDATED',
          'This Welcome plugin package is outdated. Please build or download the latest package.',
          HttpStatus.BAD_REQUEST,
          { pluginId: manifest.id, reason: 'missing_package_metadata' },
        );
      }

      if (packageVersion && semver.lt(packageVersion, '1.1.0')) {
        throw new PluginOperationException(
          'PLUGIN_PACKAGE_OUTDATED',
          'This Welcome plugin package is outdated. Please build or download the latest package.',
          HttpStatus.BAD_REQUEST,
          { pluginId: manifest.id, packageVersion, requiredVersion: '1.1.0' },
        );
      }
    }
  }

  private async validateRuntimeEntry(sourceDir: string, manifest: PluginManifest): Promise<void> {
    const jsEntry = manifest.entry.replace(/\.ts$/u, '.js');
    const candidates = [
      join(sourceDir, 'dist', jsEntry),
      join(sourceDir, jsEntry),
      join(sourceDir, manifest.entry),
    ];

    for (const candidate of candidates) {
      try {
        const s = await stat(candidate);
        if (s.isFile()) {
          return;
        }
      } catch {
        // continue to next candidate
      }
    }

    throw new BadRequestException(
      `Plugin runtime entry was not found. Checked: ${candidates.join(', ')}.`,
    );
  }

  private async validateDashboardContent(sourceDir: string, manifest: PluginManifest): Promise<void> {
    if (!manifest.dashboard?.enabled && !manifest.capabilities.dashboard) {
      return;
    }

    const schemaPath = join(sourceDir, 'dashboard.schema.json');
    let raw: string;
    try {
      raw = await readFile(schemaPath, 'utf8');
    } catch (error) {
      if (isMissingFile(error)) {
        const detectedFiles = await this.listFiles(sourceDir);
        this.logger.warn(
          {
            pluginId: manifest.id,
            normalizedRoot: sourceDir,
            detectedFiles,
            expectedDashboardSchemaPaths: ['dashboard.schema.json'],
          },
          'Plugin dashboard schema missing after package root normalization',
        );
        throw new PluginOperationException(
          'PLUGIN_DASHBOARD_MISSING',
          'This plugin package is incomplete. It declares a dashboard but does not include one.',
          HttpStatus.BAD_REQUEST,
          { pluginId: manifest.id, dashboardSchemaMissing: true },
        );
      }
      throw error;
    }

    try {
      pluginDashboardSchemaDocumentSchema.parse(JSON.parse(raw));
    } catch (error) {
      throw new PluginOperationException(
        'PLUGIN_DASHBOARD_SCHEMA_INVALID',
        'The plugin dashboard file is not valid. Please upload a complete plugin package.',
        HttpStatus.BAD_REQUEST,
        { pluginId: manifest.id, reason: error instanceof Error ? error.message : 'Unknown schema error.' },
      );
    }
  }

  private async ensureSafeInstall(targetDir: string, manifest: PluginManifest): Promise<void> {
    try {
      const existing = await stat(targetDir);
      if (existing.isDirectory()) {
        throw new PluginOperationException(
          'PLUGIN_ALREADY_INSTALLED',
          `Plugin "${manifest.id}" is already installed.`,
          HttpStatus.CONFLICT,
          { pluginId: manifest.id, version: manifest.version, path: targetDir },
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const existingPlugin = await this.pluginRepository.getPlugin(manifest.id).catch(() => null);
    if (existingPlugin && existingPlugin.version !== manifest.version) {
      throw new PluginOperationException(
        'PLUGIN_VERSION_CONFLICT',
        `Plugin "${manifest.id}" is already registered with version ${existingPlugin.version}.`,
        HttpStatus.CONFLICT,
        { pluginId: manifest.id, existingVersion: existingPlugin.version, uploadedVersion: manifest.version },
      );
    }
  }

  private async copyPluginFiles(sourceDir: string, targetDir: string): Promise<void> {
    await mkdir(targetDir, { recursive: true });

    const copyRecursive = async (src: string, dest: string): Promise<void> => {
      const entries = await readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
          await mkdir(destPath, { recursive: true });
          await copyRecursive(srcPath, destPath);
        } else {
          await copyFile(srcPath, destPath);
        }
      }
    };

    await copyRecursive(sourceDir, targetDir);
  }

  private async registerPlugin(manifest: PluginManifest, guildId: string): Promise<void> {
    await this.pluginRepository.registerManifest(manifest);
    await this.pluginRepository.setEnabled(guildId, manifest.id, false);
  }

  private getInstalledPluginDirectory(pluginId: string): string {
    return this.pluginDiscoveryService.getInstalledPluginDirectory(pluginId);
  }

  private async listFiles(dir: string): Promise<string[]> {
    const walk = async (root: string): Promise<string[]> => {
      const entries = await readdir(root, { withFileTypes: true });
      const paths: string[] = [];
      for (const entry of entries) {
        const fullPath = join(root, entry.name);
        if (entry.isDirectory()) {
          paths.push(...(await walk(fullPath)));
        } else {
          paths.push(fullPath.slice(dir.length + 1));
        }
      }
      return paths;
    };
    try {
      return await walk(dir);
    } catch {
      return [];
    }
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isUnsafeArchiveEntry(entryName: string): boolean {
  const normalized = normalize(entryName);
  return (
    entryName.includes('..') ||
    entryName.startsWith('/') ||
    entryName.startsWith('\\') ||
    /^[a-zA-Z]:[\\/]/u.test(entryName) ||
    normalized.startsWith('..') ||
    normalized.startsWith('/') ||
    normalized.startsWith('\\') ||
    /^[a-zA-Z]:[\\/]/u.test(normalized)
  );
}
