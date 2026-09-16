import { Button, Input } from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, SmilePlusIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import Fuse from 'fuse.js';
import { guildEmojisQuery } from '../hooks/queries.js';

const unicodeEmojis: Array<{ value: string; label: string; keywords: string[] }> = [
  { value: '😀', label: 'grinning face', keywords: ['smile', 'happy'] },
  { value: '😁', label: 'beaming face', keywords: ['smile', 'happy'] },
  { value: '😂', label: 'face with tears of joy', keywords: ['laugh', 'funny'] },
  { value: '😊', label: 'smiling face', keywords: ['smile', 'happy'] },
  { value: '😍', label: 'heart eyes', keywords: ['love', 'heart'] },
  { value: '🤔', label: 'thinking face', keywords: ['think', 'hmm'] },
  { value: '😎', label: 'smiling face with sunglasses', keywords: ['cool'] },
  { value: '🥳', label: 'partying face', keywords: ['party', 'celebrate'] },
  { value: '👍', label: 'thumbs up', keywords: ['like', 'approve'] },
  { value: '👏', label: 'clapping hands', keywords: ['applause', 'praise'] },
  { value: '🔥', label: 'fire', keywords: ['hot', 'trending'] },
  { value: '✨', label: 'sparkles', keywords: ['stars', 'magic'] },
  { value: '✅', label: 'check mark', keywords: ['done', 'yes'] },
  { value: '❌', label: 'cross mark', keywords: ['no', 'remove'] },
  { value: '⚠️', label: 'warning', keywords: ['alert', 'caution'] },
  { value: '💡', label: 'light bulb', keywords: ['idea'] },
  { value: '🚀', label: 'rocket', keywords: ['launch', 'fast'] },
  { value: '🎉', label: 'party popper', keywords: ['celebrate'] },
  { value: '❤️', label: 'red heart', keywords: ['love'] },
  { value: '💬', label: 'speech balloon', keywords: ['chat', 'message'] },
];

const unicodeEmojiFuse = new Fuse(unicodeEmojis, {
  keys: ['label', 'keywords'],
  threshold: 0.4,
});

export interface EmojiSelection {
  value: string;
  label: string;
  source: 'unicode' | 'server';
}

export function EmojiPicker({
  guildId,
  onSelect,
}: {
  guildId: string;
  onSelect: (selection: EmojiSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'unicode' | 'server'>('unicode');
  const [search, setSearch] = useState('');
  const emojis = useQuery({ ...guildEmojisQuery(guildId), enabled: open && tab === 'server' });
  const serverEmojiFuse = useMemo(
    () => new Fuse(emojis.data?.data ?? [], { keys: ['name'], threshold: 0.4 }),
    [emojis.data],
  );
  const serverEmojis = useMemo(
    () =>
      search.trim()
        ? serverEmojiFuse.search(search).map((result) => result.item)
        : (emojis.data?.data ?? []),
    [emojis.data, search, serverEmojiFuse],
  );
  const filteredUnicodeEmojis = useMemo(
    () =>
      search.trim()
        ? unicodeEmojiFuse.search(search).map((result) => result.item)
        : unicodeEmojis,
    [search],
  );

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SmilePlusIcon data-icon="inline-start" />
        Emoji
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="emoji-picker-title"
            className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id="emoji-picker-title" className="font-semibold">
                  Insert emoji
                </h2>
                <p className="text-xs text-muted-foreground">Unicode or this server&apos;s custom set</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Close emoji picker"
                onClick={() => setOpen(false)}
              >
                <XIcon />
              </Button>
            </header>
            <div className="flex border-b border-border p-1">
              {(['unicode', 'server'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={tab === value ? 'secondary' : 'ghost'}
                  className="flex-1"
                  onClick={() => setTab(value)}
                >
                  {value === 'unicode' ? 'Default Emojis' : 'Server Emojis'}
                </Button>
              ))}
            </div>
            <div className="min-h-72 p-4">
              {tab === 'server' ? (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-input px-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40">
                  <SearchIcon className="size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search server emojis"
                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              ) : null}
              {tab === 'unicode' ? (
                <div className="grid grid-cols-8 gap-2">
                  {filteredUnicodeEmojis.map((emoji) => (
                    <button
                      key={emoji.value}
                      title={emoji.label}
                      className="flex aspect-square items-center justify-center rounded-md text-xl hover:bg-accent"
                      onClick={() => {
                        onSelect({ value: emoji.value, label: emoji.label, source: 'unicode' });
                        setOpen(false);
                      }}
                    >
                      {emoji.value}
                    </button>
                  ))}
                </div>
              ) : emojis.isLoading ? (
                <p className="py-20 text-center text-sm text-muted-foreground">
                  Loading server emojis...
                </p>
              ) : emojis.isError ? (
                <p className="py-20 text-center text-sm text-destructive">{emojis.error.message}</p>
              ) : serverEmojis.length === 0 ? (
                <p className="py-20 text-center text-sm text-muted-foreground">
                  No matching server emojis.
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {serverEmojis.map((emoji) => (
                    <button
                      key={emoji.id}
                      title={`:${emoji.name}:`}
                      className="flex aspect-square items-center justify-center rounded-md p-2 hover:bg-accent"
                      onClick={() => {
                        onSelect({
                          value: `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`,
                          label: emoji.name,
                          source: 'server',
                        });
                        setOpen(false);
                      }}
                    >
                      <img src={emoji.imageUrl} alt="" className="size-7 object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
