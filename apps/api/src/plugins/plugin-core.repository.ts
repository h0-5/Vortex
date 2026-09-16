import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  commandAliases,
  commandPermissions,
  guildPluginCommands,
  pluginCommands,
  pluginLogSettings,
  pluginStorage,
  pluginTemplates,
  templateVersions,
  type Database,
} from '@vortex/database';
import {
  validateTemplate,
  type PluginScope,
  type PluginStorageRepository,
  type PluginTemplateRepository,
  type TemplateInput,
} from '@vortex/shared';
import type {
  CommandPermissionConfig,
  PluginCommand,
  PluginLogSettings,
  PluginTemplate,
  UpdatePluginCommand,
  UpdatePluginLogSettings,
} from '@vortex/types';
import { and, desc, eq, like, ne } from 'drizzle-orm';

import { DATABASE } from '../config/tokens.js';

const emptyPermissions: CommandPermissionConfig = {
  allowedRoleIds: [],
  ignoredRoleIds: [],
  ignoredChannelIds: [],
  enabledChannelIds: [],
};

@Injectable()
export class PluginCoreRepository implements PluginStorageRepository, PluginTemplateRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async listCommands(scope: PluginScope): Promise<PluginCommand[]> {
    const rows = await this.database
      .select({
        command: pluginCommands,
        customization: guildPluginCommands,
        permissions: commandPermissions,
      })
      .from(pluginCommands)
      .leftJoin(
        guildPluginCommands,
        and(
          eq(guildPluginCommands.guildId, pluginCommands.guildId),
          eq(guildPluginCommands.pluginId, pluginCommands.pluginId),
          eq(guildPluginCommands.commandId, pluginCommands.commandId),
        ),
      )
      .leftJoin(
        commandPermissions,
        and(
          eq(commandPermissions.guildId, pluginCommands.guildId),
          eq(commandPermissions.pluginId, pluginCommands.pluginId),
          eq(commandPermissions.commandId, pluginCommands.commandId),
        ),
      )
      .where(
        and(eq(pluginCommands.guildId, scope.guildId), eq(pluginCommands.pluginId, scope.pluginId)),
      );
    const aliases = await this.database
      .select()
      .from(commandAliases)
      .where(
        and(eq(commandAliases.guildId, scope.guildId), eq(commandAliases.pluginId, scope.pluginId)),
      );

    return rows.map(({ command, customization, permissions }) => ({
      commandId: command.commandId,
      ...scope,
      defaultName: command.defaultName,
      name: customization?.name ?? command.defaultName,
      defaultDescription: command.defaultDescription,
      description: customization?.description ?? command.defaultDescription,
      type: command.type,
      enabled: customization?.enabled ?? true,
      aliases: aliases
        .filter((alias) => alias.commandId === command.commandId)
        .map((alias) => alias.alias),
      defaultPermissions: command.defaultPermissions,
      permissions: permissions
        ? {
            allowedRoleIds: permissions.allowedRoleIds,
            ignoredRoleIds: permissions.ignoredRoleIds,
            ignoredChannelIds: permissions.ignoredChannelIds,
            enabledChannelIds: permissions.enabledChannelIds,
          }
        : emptyPermissions,
      autoDeleteReplyOnAuthorDelete:
        customization?.autoDeleteReplyOnAuthorDelete ?? command.autoDeleteReplyOnAuthorDelete,
      autoDeleteAuthorMessage:
        customization?.autoDeleteAuthorMessage ?? command.autoDeleteAuthorMessage,
      updatedAt: (customization?.updatedAt ?? command.updatedAt).toISOString(),
    }));
  }

  async updateCommand(
    scope: PluginScope,
    commandId: string,
    update: UpdatePluginCommand,
  ): Promise<PluginCommand> {
    const [command] = await this.database
      .select()
      .from(pluginCommands)
      .where(
        and(
          eq(pluginCommands.guildId, scope.guildId),
          eq(pluginCommands.pluginId, scope.pluginId),
          eq(pluginCommands.commandId, commandId),
        ),
      )
      .limit(1);
    if (!command) {
      throw new NotFoundException(`Command ${commandId} is not registered.`);
    }
    const finalName = update.name ?? command.defaultName;
    const [conflict] = await this.database
      .select({ id: guildPluginCommands.id })
      .from(guildPluginCommands)
      .where(
        and(
          eq(guildPluginCommands.guildId, scope.guildId),
          eq(guildPluginCommands.name, finalName),
          ne(guildPluginCommands.commandId, commandId),
        ),
      )
      .limit(1);
    if (conflict) {
      throw new ConflictException(`Command name "${finalName}" is already used in this guild.`);
    }

    await this.database.transaction(async (transaction) => {
      await transaction
        .insert(guildPluginCommands)
        .values({
          ...scope,
          commandId,
          name: finalName,
          description: update.description ?? command.defaultDescription,
          enabled: update.enabled ?? true,
          autoDeleteReplyOnAuthorDelete:
            update.autoDeleteReplyOnAuthorDelete ?? command.autoDeleteReplyOnAuthorDelete,
          autoDeleteAuthorMessage:
            update.autoDeleteAuthorMessage ?? command.autoDeleteAuthorMessage,
        })
        .onConflictDoUpdate({
          target: [
            guildPluginCommands.guildId,
            guildPluginCommands.pluginId,
            guildPluginCommands.commandId,
          ],
          set: {
            ...(update.name === undefined ? {} : { name: update.name }),
            ...(update.description === undefined ? {} : { description: update.description }),
            ...(update.enabled === undefined ? {} : { enabled: update.enabled }),
            ...(update.autoDeleteReplyOnAuthorDelete === undefined
              ? {}
              : { autoDeleteReplyOnAuthorDelete: update.autoDeleteReplyOnAuthorDelete }),
            ...(update.autoDeleteAuthorMessage === undefined
              ? {}
              : { autoDeleteAuthorMessage: update.autoDeleteAuthorMessage }),
            updatedAt: new Date(),
          },
        });

      if (update.aliases) {
        await transaction
          .delete(commandAliases)
          .where(
            and(
              eq(commandAliases.guildId, scope.guildId),
              eq(commandAliases.pluginId, scope.pluginId),
              eq(commandAliases.commandId, commandId),
            ),
          );
        if (update.aliases.length > 0) {
          await transaction
            .insert(commandAliases)
            .values(update.aliases.map((alias) => ({ ...scope, commandId, alias })));
        }
      }
      if (update.permissions) {
        await transaction
          .insert(commandPermissions)
          .values({ ...scope, commandId, ...update.permissions })
          .onConflictDoUpdate({
            target: [
              commandPermissions.guildId,
              commandPermissions.pluginId,
              commandPermissions.commandId,
            ],
            set: { ...update.permissions, updatedAt: new Date() },
          });
      }
    });
    const commands = await this.listCommands(scope);
    return commands.find((candidate) => candidate.commandId === commandId)!;
  }

  async getLogSettings(scope: PluginScope): Promise<PluginLogSettings> {
    const [row] = await this.database
      .select()
      .from(pluginLogSettings)
      .where(
        and(
          eq(pluginLogSettings.guildId, scope.guildId),
          eq(pluginLogSettings.pluginId, scope.pluginId),
        ),
      )
      .limit(1);
    return row
      ? toLogSettings(row)
      : {
          ...scope,
          destination: 'DASHBOARD',
          channelId: null,
          outputType: 'text',
          embedColor: null,
          updatedAt: new Date(0).toISOString(),
        };
  }

  async updateLogSettings(
    scope: PluginScope,
    update: UpdatePluginLogSettings,
  ): Promise<PluginLogSettings> {
    const [row] = await this.database
      .insert(pluginLogSettings)
      .values({ ...scope, ...update })
      .onConflictDoUpdate({
        target: [pluginLogSettings.guildId, pluginLogSettings.pluginId],
        set: { ...update, updatedAt: new Date() },
      })
      .returning();
    return toLogSettings(row!);
  }

  async get<T>(scope: PluginScope, key: string): Promise<T | null> {
    const [row] = await this.database
      .select({ value: pluginStorage.value })
      .from(pluginStorage)
      .where(
        and(
          eq(pluginStorage.guildId, scope.guildId),
          eq(pluginStorage.pluginId, scope.pluginId),
          eq(pluginStorage.key, key),
        ),
      )
      .limit(1);
    return (row?.value as T | undefined) ?? null;
  }

  async set<T>(scope: PluginScope, key: string, value: T): Promise<void> {
    await this.database
      .insert(pluginStorage)
      .values({ ...scope, key, value })
      .onConflictDoUpdate({
        target: [pluginStorage.guildId, pluginStorage.pluginId, pluginStorage.key],
        set: { value, updatedAt: new Date() },
      });
  }

  async delete(scope: PluginScope, key: string): Promise<void> {
    await this.database
      .delete(pluginStorage)
      .where(
        and(
          eq(pluginStorage.guildId, scope.guildId),
          eq(pluginStorage.pluginId, scope.pluginId),
          eq(pluginStorage.key, key),
        ),
      );
  }

  async list<T>(scope: PluginScope, prefix = ''): Promise<Array<{ key: string; value: T }>> {
    const rows = await this.database
      .select({ key: pluginStorage.key, value: pluginStorage.value })
      .from(pluginStorage)
      .where(
        and(
          eq(pluginStorage.guildId, scope.guildId),
          eq(pluginStorage.pluginId, scope.pluginId),
          like(pluginStorage.key, `${prefix}%`),
        ),
      );
    return rows.map((row) => ({ key: row.key, value: row.value as T }));
  }

  async save(scope: PluginScope, template: TemplateInput): Promise<PluginTemplate> {
    validateTemplate(template);
    const [row] = await this.database
      .insert(pluginTemplates)
      .values({
        ...scope,
        name: template.name,
        type: template.type,
        contentMode: template.contentMode,
        content: template.content,
        variables: template.variables ?? [],
        previewData: template.previewData ?? {},
      })
      .onConflictDoUpdate({
        target: [pluginTemplates.guildId, pluginTemplates.pluginId, pluginTemplates.name],
        set: {
          type: template.type,
          contentMode: template.contentMode,
          content: template.content,
          variables: template.variables ?? [],
          previewData: template.previewData ?? {},
          updatedAt: new Date(),
        },
      })
      .returning();
    const [latest] = await this.database
      .select({ version: templateVersions.version })
      .from(templateVersions)
      .where(
        and(
          eq(templateVersions.guildId, scope.guildId),
          eq(templateVersions.pluginId, scope.pluginId),
          eq(templateVersions.templateId, row!.id),
        ),
      )
      .orderBy(desc(templateVersions.version))
      .limit(1);
    const version = (latest?.version ?? 0) + 1;
    await this.database.insert(templateVersions).values({
      ...scope,
      templateId: row!.id,
      version,
      content: template.content,
    });
    return toTemplate(row!, version);
  }

  async getTemplate(scope: PluginScope, name: string): Promise<PluginTemplate | null> {
    const templates = await this.listTemplates(scope);
    return templates.find((template) => template.name === name) ?? null;
  }

  async listTemplates(scope: PluginScope): Promise<PluginTemplate[]> {
    const rows = await this.database
      .select()
      .from(pluginTemplates)
      .where(
        and(
          eq(pluginTemplates.guildId, scope.guildId),
          eq(pluginTemplates.pluginId, scope.pluginId),
        ),
      );
    return Promise.all(
      rows.map(async (row) => {
        const [latest] = await this.database
          .select({ version: templateVersions.version })
          .from(templateVersions)
          .where(
            and(
              eq(templateVersions.guildId, scope.guildId),
              eq(templateVersions.pluginId, scope.pluginId),
              eq(templateVersions.templateId, row.id),
            ),
          )
          .orderBy(desc(templateVersions.version))
          .limit(1);
        return toTemplate(row, latest?.version ?? 1);
      }),
    );
  }

  async deleteTemplate(scope: PluginScope, name: string): Promise<void> {
    await this.database
      .delete(pluginTemplates)
      .where(
        and(
          eq(pluginTemplates.guildId, scope.guildId),
          eq(pluginTemplates.pluginId, scope.pluginId),
          eq(pluginTemplates.name, name),
        ),
      );
  }

  async duplicateTemplate(
    scope: PluginScope,
    sourceName: string,
    targetName: string,
  ): Promise<PluginTemplate> {
    const source = await this.getTemplate(scope, sourceName);
    if (!source) {
      throw new NotFoundException(`Template ${sourceName} does not exist.`);
    }
    return this.save(scope, {
      name: targetName,
      type: source.type,
      contentMode: source.contentMode,
      content: source.content,
      variables: source.variables,
      previewData: source.previewData,
    });
  }
}

export function toLogSettings(row: typeof pluginLogSettings.$inferSelect): PluginLogSettings {
  return {
    guildId: row.guildId,
    pluginId: row.pluginId,
    destination: row.destination,
    channelId: row.channelId,
    outputType: row.outputType,
    embedColor: row.embedColor,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTemplate(row: typeof pluginTemplates.$inferSelect, version: number): PluginTemplate {
  return {
    id: row.id,
    guildId: row.guildId,
    pluginId: row.pluginId,
    name: row.name,
    type: row.type,
    contentMode: row.contentMode,
    content: row.content,
    variables: row.variables,
    previewData: row.previewData,
    version,
    updatedAt: row.updatedAt.toISOString(),
  };
}
