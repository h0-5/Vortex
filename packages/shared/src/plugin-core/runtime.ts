import type {
  CommandCustomization,
  CommandRegistration,
  PluginChannels,
  PluginCommands,
  PluginComponents,
  PluginContext,
  PluginEmbeds,
  PluginEvents,
  PluginGuild,
  PluginInteractions,
  PluginLogger,
  PluginMessages,
  PluginModule,
  PluginPermissions,
  PluginScope,
  PluginStorage,
  PluginDatabase,
  PluginTemplates,
  PluginVariables,
  CommandRegistrationWriter,
} from '../plugin-contracts.js';
import type { CommandRegistry } from './command-registry.js';
import type { EventRegistry } from './event-registry.js';
import type { InteractionRegistry } from './interaction-registry.js';
import { ScopedPluginScheduler } from './scheduler.js';

export class PluginRegistry {
  private readonly modules = new Map<string, PluginModule>();

  register(pluginId: string, module: PluginModule): void {
    if (this.modules.has(pluginId)) {
      throw new Error(`Plugin module ${pluginId} is already registered.`);
    }
    this.modules.set(pluginId, module);
  }

  get(pluginId: string): PluginModule | null {
    return this.modules.get(pluginId) ?? null;
  }
}

export interface PluginContextDependencies {
  logger: PluginLogger;
  permissions: PluginPermissions;
  variables: PluginVariables;
  templates: PluginTemplates;
  messages: PluginMessages;
  embeds: PluginEmbeds;
  components: PluginComponents;
  storage: PluginStorage;
  database: PluginDatabase;
  channels?: PluginChannels;
  guild?: PluginGuild;
  createInvite?: PluginCommands['createInvite'];
  getGuildInvites?: PluginEvents['getGuildInvites'];
  commandWriter?: CommandRegistrationWriter;
}

export class PluginRuntime {
  constructor(
    private readonly registry: PluginRegistry,
    private readonly commands: CommandRegistry,
    private readonly events: EventRegistry,
    private readonly interactions: InteractionRegistry,
  ) {}

  createContext(scope: PluginScope, dependencies: PluginContextDependencies): PluginContext {
    const commandApi: PluginCommands = {
      register: async (
        registration: CommandRegistration,
        customization?: CommandCustomization,
      ) => {
        const persisted = await dependencies.commandWriter?.register(scope, registration);
        this.commands.register(
          scope,
          registration,
          dependencies.permissions,
          dependencies.logger,
          { ...customization, ...persisted },
        );
      },
      createInvite:
        dependencies.createInvite ??
        (() => Promise.reject(new Error('Invite creation adapter is not configured.'))),
    };
    const eventApi: PluginEvents = {
      on: (event, handler) => this.events.on(scope, event, handler, dependencies.logger),
      getGuildInvites:
        dependencies.getGuildInvites ??
        (() => Promise.reject(new Error('Invite adapter is not configured.'))),
    };
    const interactionApi: PluginInteractions = {
      onButton: (customId, handler) =>
        this.interactions.register(scope, 'button', customId, handler, dependencies.logger),
      onSelect: (customId, handler) =>
        this.interactions.register(scope, 'select', customId, handler, dependencies.logger),
      onModal: (customId, handler) =>
        this.interactions.register(scope, 'modal', customId, handler, dependencies.logger),
    };
    const channelsApi: PluginChannels =
      dependencies.channels ??
      {
        describe: () => Promise.reject(new Error('Channel adapter is not configured.')),
        createText: () => Promise.reject(new Error('Channel adapter is not configured.')),
        createPrivateThread: () => Promise.reject(new Error('Thread adapter is not configured.')),
        addThreadMember: () => Promise.reject(new Error('Thread adapter is not configured.')),
        createCategory: () => Promise.reject(new Error('Channel adapter is not configured.')),
        setPermissions: () => Promise.reject(new Error('Channel adapter is not configured.')),
        setTopic: () => Promise.reject(new Error('Channel adapter is not configured.')),
        moveToCategory: () => Promise.reject(new Error('Channel adapter is not configured.')),
        delete: () => Promise.reject(new Error('Channel adapter is not configured.')),
        rename: () => Promise.reject(new Error('Channel adapter is not configured.')),
        setSlowmode: () => Promise.reject(new Error('Channel adapter is not configured.')),
      };
    const guildApi: PluginGuild =
      dependencies.guild ??
      {
        getBotUserId: () => Promise.reject(new Error('Guild adapter is not configured.')),
        fetchMember: () => Promise.reject(new Error('Guild adapter is not configured.')),
        hasPermission: () => Promise.reject(new Error('Guild adapter is not configured.')),
        fetchAudit: () => Promise.reject(new Error('Guild adapter is not configured.')),
        fetchUser: () => Promise.reject(new Error('Guild adapter is not configured.')),
        fetchRoles: () => Promise.reject(new Error('Guild adapter is not configured.')),
        fetchGuildInfo: () => Promise.reject(new Error('Guild adapter is not configured.')),
        timeout: () => Promise.reject(new Error('Guild adapter is not configured.')),
        moveVoiceMember: () => Promise.reject(new Error('Guild adapter is not configured.')),
        kick: () => Promise.reject(new Error('Guild adapter is not configured.')),
        ban: () => Promise.reject(new Error('Guild adapter is not configured.')),
        unban: () => Promise.reject(new Error('Guild adapter is not configured.')),
        setRoles: () => Promise.reject(new Error('Guild adapter is not configured.')),
        addRole: () => Promise.reject(new Error('Guild adapter is not configured.')),
        removeRole: () => Promise.reject(new Error('Guild adapter is not configured.')),
        deleteRole: () => Promise.reject(new Error('Guild adapter is not configured.')),
        fetchWebhooks: () => Promise.reject(new Error('Guild adapter is not configured.')),
        deleteWebhook: () => Promise.reject(new Error('Guild adapter is not configured.')),
      };
    return {
      ...scope,
      ...dependencies,
      channels: channelsApi,
      guild: guildApi,
      commands: commandApi,
      events: eventApi,
      interactions: interactionApi,
      scheduler: new ScopedPluginScheduler(dependencies.logger),
    };
  }

  async runLifecycle(
    scope: PluginScope,
    lifecycle: keyof PluginModule,
    context: PluginContext,
  ): Promise<void> {
    const module = this.registry.get(scope.pluginId);
    const handler = module?.[lifecycle];
    if (!handler) {
      return;
    }
    try {
      await handler(context);
    } catch (error) {
      await context.logger.error(`Plugin lifecycle ${lifecycle} failed.`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
