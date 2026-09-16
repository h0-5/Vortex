import { Button } from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { SmileIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { guildEmojisQuery } from '../hooks/queries.js';

const defaultEmojis = ['😀', '👋', '🎉', '✨', '🔥', '💬', '✅', '📌', '🚀', '💜', '❤️', '⭐'];

export function EmojiInsertMenu({ guildId, onInsert }: { guildId: string; onInsert: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'default' | 'server'>('default');
  const emojis = useQuery({ ...guildEmojisQuery(guildId), enabled: open && tab === 'server' });

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <SmileIcon data-icon="inline-start" />
        Emoji
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-semibold">Insert emoji</h2>
                <p className="text-sm text-muted-foreground">Add a default or server emoji to the active field.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close emojis">
                <XIcon />
              </Button>
            </div>
            <div className="flex gap-1 border-b border-border p-2">
              <Button type="button" variant={tab === 'default' ? 'secondary' : 'ghost'} onClick={() => setTab('default')}>Default Emojis</Button>
              <Button type="button" variant={tab === 'server' ? 'secondary' : 'ghost'} onClick={() => setTab('server')}>Server Emojis</Button>
            </div>
            <div className="grid max-h-72 grid-cols-8 gap-2 overflow-y-auto p-5">
              {tab === 'default'
                ? defaultEmojis.map((emoji) => (
                    <EmojiButton key={emoji} label={emoji} value={emoji} onInsert={onInsert} onClose={() => setOpen(false)} />
                  ))
                : (emojis.data?.data ?? []).map((emoji) => (
                    <EmojiButton
                      key={emoji.id}
                      label={emoji.name}
                      value={emoji.imageUrl ? `<:${emoji.name}:${emoji.id}>` : `:${emoji.name}:`}
                      image={emoji.imageUrl}
                      onInsert={onInsert}
                      onClose={() => setOpen(false)}
                    />
                  ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmojiButton({
  label,
  value,
  image,
  onInsert,
  onClose,
}: {
  label: string;
  value: string;
  image?: string | null;
  onInsert: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={() => {
        onInsert(value);
        onClose();
      }}
      className="flex size-10 items-center justify-center rounded-md border border-border bg-background text-xl hover:bg-accent"
    >
      {image ? <img src={image} alt={label} className="size-6" /> : value}
    </button>
  );
}
