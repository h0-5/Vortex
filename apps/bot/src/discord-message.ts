import type { CoreMessage } from '@vortex/types';
import { toDiscordApiPayload } from '@vortex/shared';
import type {
  InteractionReplyOptions,
  MessageCreateOptions,
} from 'discord.js';

export type DiscordReply = InteractionReplyOptions & MessageCreateOptions;

export function toDiscordReply(message: CoreMessage): DiscordReply {
  return toDiscordApiPayload(message) as DiscordReply;
}
