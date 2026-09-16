import { visualEditorLayoutSchema, type VisualEditorLayout } from '@vortex/types';

export class VisualLayoutCodec {
  parse(value: unknown): VisualEditorLayout {
    return visualEditorLayoutSchema.parse(value);
  }

  export(layout: VisualEditorLayout): string {
    return JSON.stringify(this.parse(layout));
  }

  import(serialized: string): VisualEditorLayout {
    return this.parse(JSON.parse(serialized) as unknown);
  }
}
