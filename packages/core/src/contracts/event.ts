import type { PluginEventName } from '@vortex/types';

export interface PluginInvite {
  code: string;
  uses: number;
  inviterId: string | null;
  inviterName: string | null;
}

export type PluginEventPayload = Readonly<
  Record<string, unknown> & { guildId?: string | undefined }
>;

export type PluginEventHandler = (payload: PluginEventPayload) => Promise<void> | void;

export interface PluginEvents {
  on(event: PluginEventName, handler: PluginEventHandler): () => void;
  getGuildInvites(): Promise<PluginInvite[]>;
}
