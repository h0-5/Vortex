import { componentsV2MessageSchema, coreMessageSchema, embedMessageSchema } from '@vortex/types';

import type { PluginComponents, PluginEmbeds, PluginMessages } from '../plugin-contracts.js';

export const pluginMessages: PluginMessages = {
  build: (input) => coreMessageSchema.parse(input),
  sendChannel: () => Promise.reject(new Error('Message delivery adapter is not configured.')),
  sendDirect: () => Promise.reject(new Error('Message delivery adapter is not configured.')),
  sendVisualCard: () =>
    Promise.reject(new Error('Visual card delivery adapter is not configured.')),
  readChannel: () => Promise.reject(new Error('Message read adapter is not configured.')),
  delete: () => Promise.reject(new Error('Message delivery adapter is not configured.')),
  edit: () => Promise.reject(new Error('Message edit adapter is not configured.')),
  createThread: () => Promise.reject(new Error('Message thread adapter is not configured.')),
};

export const pluginEmbeds: PluginEmbeds = {
  build: (input) => embedMessageSchema.parse({ ...input, type: 'embed' }),
};

export const pluginComponents: PluginComponents = {
  build: (input) => componentsV2MessageSchema.parse({ ...input, type: 'components_v2' }),
};
