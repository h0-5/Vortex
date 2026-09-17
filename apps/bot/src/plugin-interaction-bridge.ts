import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Client,
  type Interaction,
  type MessageComponentInteraction,
  type ModalActionRowComponentBuilder,
  type ModalSubmitInteraction,
} from 'discord.js';
import type {
  PluginComponentInteraction,
  PluginInteractionKind,
  PluginInteractionResponse,
  PluginModal,
} from '@vortex/shared';
import type { Logger } from 'pino';

import { toDiscordReply } from './discord-message.js';
import type { BotPluginRuntime } from './plugin-runtime-bridge.js';

export function registerPluginInteractionBridge(
  client: Client,
  runtime: BotPluginRuntime,
  logger: Logger,
): void {
  client.on('interactionCreate', (interaction) => {
    if (!interaction.guildId) {
      return;
    }
    const component = isComponentInteraction(interaction, runtime, logger);
    if (component) {
      void dispatchComponent(runtime, logger, component);
      return;
    }
    if (interaction.isModalSubmit()) {
      void dispatchModal(runtime, logger, interaction);
    }
  });
}

interface ResolvedComponent {
  interaction: PluginComponentInteraction;
  customId: string;
}

function isComponentInteraction(
  interaction: Interaction,
  runtime: BotPluginRuntime,
  logger: Logger,
): ResolvedComponent | null {
  if (typeof interaction.isMessageComponent !== 'function' || !interaction.isMessageComponent()) {
    return null;
  }
  if (!interaction.inGuild() || !interaction.channelId || !interaction.guildId) {
    return null;
  }
  const kind: PluginInteractionKind = interaction.isAnySelectMenu() ? 'select' : 'button';
  const customId = interaction.customId;
  if (!runtime.interactions.resolve(interaction.guildId, kind, customId)) {
    return null;
  }
  const isSelect = typeof interaction.isAnySelectMenu === 'function' && interaction.isAnySelectMenu();
  const pluginInteraction: PluginComponentInteraction = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    memberRoleIds: getInteractionRoleIds(interaction.member),
    messageId: interaction.message?.id ? String(interaction.message.id) : null,
    customId,
    kind,
    ...(isSelect ? { selectedValues: interaction.values.map(String) } : {}),
    respond: (response) =>
      respondComponent(interaction, response).catch((error: unknown) =>
        logger.error({ error }, 'Plugin component interaction response failed'),
      ),
  };
  return { interaction: pluginInteraction, customId };
}

async function dispatchComponent(
  runtime: BotPluginRuntime,
  logger: Logger,
  resolved: ResolvedComponent,
): Promise<void> {
  const handled = await runtime.interactions.dispatch(
    resolved.interaction.guildId,
    resolved.interaction.kind,
    resolved.customId,
    resolved.interaction,
  );
  if (!handled) {
    logger.debug({ customId: resolved.customId }, 'Unhandled plugin component interaction');
  }
}

async function dispatchModal(
  runtime: BotPluginRuntime,
  logger: Logger,
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.guildId || !interaction.channelId) {
    return;
  }
  const modalFields: Record<string, string> = {};
  for (const field of interaction.fields.fields) {
    if ('value' in field) {
      const textField = field as unknown as { customId: string; value: string };
      modalFields[textField.customId] = textField.value;
    }
  }
  const pluginInteraction: PluginComponentInteraction = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    userId: interaction.user.id,
    memberRoleIds: getInteractionRoleIds(interaction.member),
    messageId: interaction.message?.id ? String(interaction.message.id) : null,
    customId: interaction.customId ?? '',
    kind: 'modal',
    modalFields,
    respond: (response) =>
      respondComponent(interaction, response).catch((error: unknown) =>
        logger.error({ error }, 'Plugin modal interaction response failed'),
      ),
  };
  await runtime.interactions.dispatch(
    interaction.guildId,
    'modal',
    interaction.customId ?? '',
    pluginInteraction,
  );
}

export async function respondComponent(
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  response: PluginInteractionResponse,
): Promise<void> {
  switch (response.kind) {
    case 'reply':
      await interaction.reply({
        ...toDiscordReply(response.message),
        flags: undefined,
        ephemeral: response.ephemeral ?? false,
      });
      break;
    case 'update':
      if ('update' in interaction) {
        const { flags: _flags, ...payload } = toDiscordReply(response.message);
        await interaction.update(payload as Parameters<MessageComponentInteraction['update']>[0]);
      } else {
        await interaction.reply(toDiscordReply(response.message));
      }
      break;
    case 'deferUpdate':
      await interaction.deferUpdate();
      break;
    case 'deferReply':
      await interaction.deferReply({ ephemeral: response.ephemeral ?? false });
      break;
    case 'editReply': {
      const { flags: _flags, ...payload } = toDiscordReply(response.message);
      await interaction.editReply(payload as Parameters<MessageComponentInteraction['editReply']>[0]);
      break;
    }
    case 'showModal':
      if ('showModal' in interaction) {
        await interaction.showModal(toDiscordModal(response.modal));
      } else {
        throw new Error('A modal cannot be shown after a modal submission.');
      }
      break;
  }
}

function toDiscordModal(modal: PluginModal) {
  const fields = modal.fields.map((field) => {
    const builder = new TextInputBuilder()
      .setCustomId(field.id)
      .setLabel(field.label.slice(0, 45))
      .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(field.required ?? false);
    if (field.placeholder !== undefined) {
      builder.setPlaceholder(field.placeholder.slice(0, 100));
    }
    if (field.maxLength !== undefined) {
      builder.setMaxLength(field.maxLength);
    }
    if (field.minLength !== undefined) {
      builder.setMinLength(field.minLength);
    }
    return builder;
  });
  return new ModalBuilder()
    .setCustomId(modal.id)
    .setTitle(modal.title.slice(0, 45))
    .addComponents(
      fields.map((field) => new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(field)),
    );
}

function getInteractionRoleIds(member: Interaction['member']): string[] {
  if (!member) {
    return [];
  }
  return Array.isArray(member.roles) ? member.roles : [...member.roles.cache.keys()];
}