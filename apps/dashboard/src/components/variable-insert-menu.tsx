import { Button, Input, ScrollArea } from '@vortex/ui';
import { useMemo, useState } from 'react';

export interface VariableItem {
  key: string;
  label: string;
  description: string;
  group: string;
}

export interface VariableInsertMenuProps {
  variables?: VariableItem[] | undefined;
  onInsert: (value: string) => void;
}

export function VariableInsertMenu({ variables = [], onInsert }: VariableInsertMenuProps) {
  const [search, setSearch] = useState('');
  const filteredVariables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return variables;
    return variables.filter((variable) =>
      [variable.key, variable.label, variable.description, variable.group].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, variables]);
  const groups = Array.from(new Set(filteredVariables.map((variable) => variable.group)));

  return (
    <div className="flex flex-col">
      <div className="border-b border-border p-3">
        <Input
          autoFocus
          placeholder="Search variables"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ScrollArea className="max-h-80">
        <div className="grid gap-3 p-3">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No variables available.</p>
          ) : (
            groups.map((group) => (
              <section key={group} className="grid gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group}</h3>
                {filteredVariables
                  .filter((variable) => variable.group === group)
                  .map((variable) => (
                    <Button
                      key={variable.key}
                      type="button"
                      variant="ghost"
                      onClick={() => onInsert(variable.key)}
                      className="h-auto justify-start rounded-lg px-3 py-2 text-left"
                    >
                      <span className="grid gap-1">
                        <span className="text-xs font-mono text-primary">{variable.key}</span>
                        <span className="text-sm font-medium">{variable.label}</span>
                        <span className="text-xs leading-5 text-muted-foreground">{variable.description}</span>
                      </span>
                    </Button>
                  ))}
              </section>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
