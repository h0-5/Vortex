export interface PluginMessageReceipt {
  id: string;
  channelId: string;
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
  readChannel(channelId: string, limit?: number): Promise<PluginMessageEntry[]>;
  delete(channelId: string, messageId: string): Promise<void>;
  edit(channelId: string, messageId: string, message: CoreMessage): Promise<PluginMessageReceipt>;
  createThread(
    channelId: string,
    messageId: string,
    name: string,
  ): Promise<PluginThread | null>;
}

export interface PluginEmbeds {
  build(input: Record<string, unknown>): EmbedMessage;
}

export interface PluginComponents {
  build(input: Record<string, unknown>): ComponentsV2Message;
}
