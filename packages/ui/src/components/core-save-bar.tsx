import { Loader2Icon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn.js';
import { Button } from './button.js';

export interface CoreSaveBarProps {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  resetLabel?: string;
  className?: string;
}

export function CoreSaveBar({
  isDirty,
  isSubmitting,
  onReset,
  onSave,
  saveLabel = 'Save changes',
  resetLabel = 'Reset',
  className,
}: CoreSaveBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 mt-auto flex flex-col-reverse items-stretch justify-end gap-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center',
        className,
      )}
    >
      {onReset ? (
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isSubmitting}
          onClick={onReset}
        >
          {resetLabel}
        </Button>
      ) : null}
      <Button type="submit" disabled={!isDirty || isSubmitting} onClick={onSave}>
        {isSubmitting ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
        {isSubmitting ? 'Saving…' : saveLabel}
      </Button>
    </div>
  );
}
