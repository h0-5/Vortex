import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from '@vortex/ui';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, ChevronDownIcon, ListIcon, ServerIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Fuse from 'fuse.js';
import { guildsQuery } from '../hooks/queries.js';
import { getGuildDashboardPath } from '../lib/guild-actions.js';
import { useSelectedGuild } from '../state/selected-guild-context.js';
import { GuildAvatar } from './guild-avatar.js';

export function ServerSwitcher() {
  const navigate = useNavigate();
  const guilds = useQuery(guildsQuery);
  const { selectedGuildId, selectGuild, clearSelectedGuild } = useSelectedGuild();
  const selectedGuild = guilds.data?.data.find((guild) => guild.id === selectedGuildId);
  const [search, setSearch] = useState('');

  const manageableGuilds = useMemo(
    () => guilds.data?.data.filter((guild) => guild.canManage) ?? [],
    [guilds.data],
  );
  const fuse = useMemo(
    () => new Fuse(manageableGuilds, { keys: ['name'], threshold: 0.4 }),
    [manageableGuilds],
  );
  const filteredGuilds = useMemo(() => {
    if (!search.trim()) return manageableGuilds;
    return fuse.search(search).map((result) => result.item);
  }, [fuse, manageableGuilds, search]);

  useEffect(() => {
    if (guilds.isSuccess && selectedGuildId && !selectedGuild) {
      clearSelectedGuild();
    }
  }, [clearSelectedGuild, guilds.isSuccess, selectedGuild, selectedGuildId]);

  if (guilds.isLoading && selectedGuildId) {
    return <Skeleton className="h-9 w-9 sm:w-40" />;
  }

  const selectServer = (guildId: string) => {
    selectGuild(guildId);
    void navigate(getGuildDashboardPath(guildId));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-9 min-w-0 justify-center px-0 sm:w-auto sm:max-w-56 sm:justify-start sm:px-3"
          aria-label={selectedGuild ? `Switch server from ${selectedGuild.name}` : 'Select server'}
        >
          {selectedGuild ? (
            <GuildAvatar guild={selectedGuild} className="size-5" />
          ) : (
            <ServerIcon aria-hidden="true" />
          )}
          <span className="hidden min-w-0 truncate sm:block">
            {selectedGuild?.name ?? 'Select server'}
          </span>
          <ChevronDownIcon className="hidden sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)] shadow-lg">
        <DropdownMenuLabel>Manageable servers</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search servers..."
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
          />
        </div>
        <DropdownMenuGroup className="max-h-64 overflow-auto">
          {filteredGuilds.slice(0, 20).map((guild) => (
            <DropdownMenuItem
              key={guild.id}
            className="py-2"
              onSelect={() => selectServer(guild.id)}
            >
              <GuildAvatar guild={guild} className="size-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{guild.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {guild.botConnected ? 'Bot connected' : 'Bot missing'}
                </span>
              </span>
              {guild.id === selectedGuildId ? (
                <CheckIcon className="text-primary" aria-label="Selected" />
              ) : null}
            </DropdownMenuItem>
          ))}
          {guilds.isSuccess && filteredGuilds.length === 0 ? (
            <DropdownMenuItem disabled>No matching servers</DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/dashboard/select-server')}>
          <ListIcon />
          View all servers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
