export interface PluginMessageReceipt {
  id: string;
  channelId: string;
}

export interface PluginFileInput {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
}

export interface PluginThread {
  id: string;
  channelId: string;
  name: string;
}

import type { ComponentsV2Message, CoreMessage, EmbedMessage } from '@vortex/types';

export interface PluginMessageEntry {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  sentAt: string;
  authorUsername?: string | undefined;
  memberDisplayName?: string | undefined;
  memberRoleIds?: string[] | undefined;
  authorAvatarUrl?: string | null | undefined;
  replyToAuthorId?: string | null | undefined;
  replyToAuthorName?: string | null | undefined;
}

export interface PluginMessages {
  build(input: unknown): CoreMessage;
  sendChannel(channelId: string, message: CoreMessage): Promise<PluginMessageReceipt>;
  sendDirect(userId: string, message: CoreMessage): Promise<PluginMessageReceipt>;
  sendVisualCard(
    channelId: string,
    layout: unknown,
    previewData: Record<string, string>,
  ): Promise<PluginMessageReceipt>;
  sendFile(
    channelId: string,
    file: PluginFileInput,
    caption?: string,
  ): Promise<PluginMessageReceipt | null>;
  sendDirectFile(
    userId: string,
    file: PluginFileInput,
    caption?: string,
  ): Promise<PluginMessageReceipt | null>;
  readChannel(channelId: string, limit?: number): Promise<PluginMessageEntry[]>;
  delete(channelId: string, messageId: string): Promise<void>;
  edit(channelId: string, messageId: string, message: CoreMessage): Promise<PluginMessageReceipt>;
  addReaction(channelId: string, messageId: string, emoji: string): Promise<void>;
  removeUserReaction(
    channelId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void>;
  createThread(
    channelId: string,
    messageId: string,
    name: string,
    archiveDuration?: number,
  ): Promise<PluginThread | null>;
}

export interface PluginEmbeds {
  build(input: Record<string, unknown>): EmbedMessage;
}

export interface PluginComponents {
  build(input: Record<string, unknown>): ComponentsV2Message;
}
