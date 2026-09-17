import type { CoreMessage } from '@vortex/types';

export type PluginInteractionKind = 'button' | 'select' | 'modal';

export interface PluginModalField {
  id: string;
  label: string;
  style: 'short' | 'paragraph';
  required?: boolean;
  placeholder?: string;
  value?: string;
  minLength?: number;
  maxLength?: number;
}

export interface PluginModal {
  id: string;
  title: string;
  fields: PluginModalField[];
}

export type PluginInteractionResponse =
  | { kind: 'reply'; message: CoreMessage; ephemeral?: boolean }
  | { kind: 'update'; message: CoreMessage }
  | { kind: 'deferUpdate' }
  | { kind: 'deferReply'; ephemeral?: boolean }
  | { kind: 'editReply'; message: CoreMessage }
  | { kind: 'showModal'; modal: PluginModal };

export interface PluginComponentInteraction {
  guildId: string;
  channelId: string;
  userId: string;
  memberRoleIds: string[];
  messageId: string | null;
  customId: string;
  kind: PluginInteractionKind;
  modalFields?: Record<string, string>;
  selectedValues?: string[];
  respond(response: PluginInteractionResponse): Promise<void>;
}

export type PluginComponentHandler = (
  interaction: PluginComponentInteraction,
) => Promise<void> | void;

export interface PluginInteractions {
  onButton(customId: string, handler: PluginComponentHandler): () => void;
  onSelect(customId: string, handler: PluginComponentHandler): () => void;
  onModal(customId: string, handler: PluginComponentHandler): () => void;
}

export type { CoreMessage };