import { Button, Input } from '@vortex/ui';
import { ImagePlusIcon } from 'lucide-react';
import { useState } from 'react';

export function AssetPanel({
  onAddImage,
}: {
  onAddImage: (url: string, background: boolean) => void;
}) {
  const [url, setUrl] = useState('');
  return (
    <section className="p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Assets
      </p>
      <div className="space-y-2">
        <Input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://cdn.example/image.png"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!url}
            onClick={() => {
              onAddImage(url, false);
              setUrl('');
            }}
          >
            <ImagePlusIcon data-icon="inline-start" /> Image
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!url}
            onClick={() => {
              onAddImage(url, true);
              setUrl('');
            }}
          >
            Background
          </Button>
        </div>
      </div>
    </section>
  );
}
