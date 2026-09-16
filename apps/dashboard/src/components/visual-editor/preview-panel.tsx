import { Button, Textarea } from '@vortex/ui';
import { CheckIcon, ClipboardIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function PreviewPanel({
  json,
  onImport,
}: {
  json: string;
  onImport: (json: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(json);
  useEffect(() => setDraft(json), [json]);
  return (
    <section className="border-t border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          JSON output
        </p>
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" onClick={() => onImport(draft)}>
            Import
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(json).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1_500);
              });
            }}
          >
            {copied ? <CheckIcon /> : <ClipboardIcon />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-40 resize-y font-mono text-[11px] leading-5"
        aria-label="Visual editor JSON layout"
      />
    </section>
  );
}
