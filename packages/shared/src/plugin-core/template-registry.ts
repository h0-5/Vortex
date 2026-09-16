import { coreMessageSchema, visualEditorLayoutSchema, type PluginTemplate } from '@vortex/types';

import type {
  PluginScope,
  PluginTemplateRepository,
  PluginTemplates,
  TemplateInput,
} from '../plugin-contracts.js';

export class ScopedTemplateRegistry implements PluginTemplates {
  constructor(
    private readonly scope: PluginScope,
    private readonly repository: PluginTemplateRepository,
  ) {}

  save(template: TemplateInput): Promise<PluginTemplate> {
    validateTemplate(template);
    return this.repository.save(this.scope, template);
  }

  get(name: string): Promise<PluginTemplate | null> {
    return this.repository.getTemplate(this.scope, name);
  }

  list(): Promise<PluginTemplate[]> {
    return this.repository.listTemplates(this.scope);
  }
}

export function validateTemplate(template: TemplateInput): void {
  if (!template.name.trim() || template.name.length > 100) {
    throw new Error('Template names must contain between 1 and 100 characters.');
  }
  if (template.contentMode === 'visual_card') {
    visualEditorLayoutSchema.parse(template.content);
    return;
  }
  const message = coreMessageSchema.parse(template.content);
  if (message.type !== template.contentMode) {
    throw new Error('Template content does not match its content mode.');
  }
}
