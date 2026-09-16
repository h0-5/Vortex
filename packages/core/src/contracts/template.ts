import type { PluginTemplate, TemplateContentMode } from '@vortex/types';
import type { PluginScope } from './runtime.js';

export interface TemplateInput {
  name: string;
  type: string;
  contentMode: TemplateContentMode;
  content: unknown;
  variables?: string[];
  previewData?: Record<string, string>;
}

export interface PluginTemplates {
  save(template: TemplateInput): Promise<PluginTemplate>;
  get(name: string): Promise<PluginTemplate | null>;
  list(): Promise<PluginTemplate[]>;
}

export interface PluginTemplateRepository {
  save(scope: PluginScope, template: TemplateInput): Promise<PluginTemplate>;
  getTemplate(scope: PluginScope, name: string): Promise<PluginTemplate | null>;
  listTemplates(scope: PluginScope): Promise<PluginTemplate[]>;
  duplicateTemplate(scope: PluginScope, name: string, nextName: string): Promise<PluginTemplate>;
  deleteTemplate(scope: PluginScope, name: string): Promise<void>;
}
