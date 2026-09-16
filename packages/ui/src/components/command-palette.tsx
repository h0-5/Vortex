import { Command } from 'cmdk';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn.js';
import { Dialog, DialogContent, DialogTitle } from './dialog.js';

export interface CommandPaletteItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  group?: string;
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
  emptyMessage?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = 'Type a command or search...',
  emptyMessage = 'No commands found.',
  search,
  onSearchChange,
}: CommandPaletteProps) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, CommandPaletteItem[]>();
    for (const item of items) {
      const group = item.group ?? 'Actions';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    }
    return map;
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <SearchIcon className="mr-2 size-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder={placeholder}
              value={search ?? ''}
              onValueChange={onSearchChange ?? (() => {})}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden py-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </Command.Empty>
            {Array.from(grouped.entries()).map(([group, groupItems]) => (
              <Command.Group key={group} heading={group} className="px-2 py-2">
                {groupItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    disabled={Boolean(item.disabled)}
                    onSelect={() => {
                      item.onSelect();
                      onOpenChange(false);
                    }}
                    className={cn(
                      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
                    )}
                  >
                    {item.icon ? (
                      <span className="mr-2 size-4 shrink-0 text-muted-foreground">{item.icon}</span>
                    ) : null}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut ? (
                      <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
                        {item.shortcut}
                      </kbd>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
