import { Input, Label, Textarea } from '@vortex/ui';
import type { VisualEditorElement } from '@vortex/types';

const numericFields = ['x', 'y', 'width', 'height'] as const;

export function ElementInspector({
  element,
  onChange,
}: {
  element: VisualEditorElement | null;
  onChange: (patch: Partial<VisualEditorElement>) => void;
}) {
  return (
    <section className="border-b border-border p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Inspector
      </p>
      {!element ? (
        <p className="text-sm text-muted-foreground">Select an element on the canvas.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {numericFields.map((field) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">{field}</Label>
              <Input
                type="number"
                min={field === 'width' || field === 'height' ? 1 : undefined}
                value={Math.round(element[field])}
                onChange={(event) => onChange({ [field]: Number(event.target.value) })}
              />
            </div>
          ))}
          {element.type === 'text' ? (
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">TEXT</Label>
              <Textarea
                value={element.text}
                onChange={(event) => onChange({ text: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
