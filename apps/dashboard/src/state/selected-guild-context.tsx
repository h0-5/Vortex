import * as React from 'react';

const STORAGE_KEY = 'vortex.selectedGuildId';

interface SelectedGuildContextValue {
  selectedGuildId: string | undefined;
  selectGuild: (guildId: string) => void;
  clearSelectedGuild: () => void;
}

const SelectedGuildContext = React.createContext<SelectedGuildContextValue | undefined>(undefined);

export function SelectedGuildProvider({ children }: React.PropsWithChildren) {
  const [selectedGuildId, setSelectedGuildId] = React.useState<string | undefined>(() => {
    return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
  });

  const selectGuild = React.useCallback((guildId: string) => {
    window.localStorage.setItem(STORAGE_KEY, guildId);
    setSelectedGuildId(guildId);
  }, []);

  const clearSelectedGuild = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSelectedGuildId(undefined);
  }, []);

  const value = React.useMemo(
    () => ({ selectedGuildId, selectGuild, clearSelectedGuild }),
    [clearSelectedGuild, selectGuild, selectedGuildId],
  );

  return <SelectedGuildContext.Provider value={value}>{children}</SelectedGuildContext.Provider>;
}

export function useSelectedGuild(): SelectedGuildContextValue {
  const context = React.useContext(SelectedGuildContext);
  if (!context) {
    throw new Error('useSelectedGuild must be used inside SelectedGuildProvider.');
  }
  return context;
}
