import { Button } from '@vortex/ui';
import { ImageIcon, ServerIcon, TypeIcon, UserRoundIcon, WallpaperIcon } from 'lucide-react';

import type { VisualElementKind } from './visual-editor.js';

export function CanvasToolbar({ onAdd }: { onAdd: (kind: VisualElementKind) => void }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border p-3">
      <Button size="sm" variant="outline" onClick={() => onAdd('text')}>
        <TypeIcon data-icon="inline-start" /> Text
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAdd('image')}>
        <ImageIcon data-icon="inline-start" /> Image
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAdd('avatar')}>
        <UserRoundIcon data-icon="inline-start" /> Avatar
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAdd('server_icon')}>
        <ServerIcon data-icon="inline-start" /> Server icon
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAdd('background')}>
        <WallpaperIcon data-icon="inline-start" /> Background
      </Button>
    </div>
  );
}
