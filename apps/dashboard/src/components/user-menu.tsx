import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
} from '@vortex/ui';
import type { User } from '@vortex/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, CircleUserRoundIcon, LogOutIcon, Settings2Icon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { api } from '../lib/api-client.js';
import { useSelectedGuild } from '../state/selected-guild-context.js';
import { UserAvatar } from './user-avatar.js';

export function UserMenu({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { clearSelectedGuild } = useSelectedGuild();
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      clearSelectedGuild();
      queryClient.clear();
      void navigate('/', { replace: true });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 max-w-48 justify-start px-2">
          <UserAvatar user={user} className="size-7" />
          <span className="hidden min-w-0 flex-1 truncate text-left sm:block">
            {user.globalName ?? user.username}
          </span>
          <ChevronDownIcon className="hidden sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)] shadow-lg">
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
          <UserAvatar user={user} className="size-9" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {user.globalName ?? user.username}
            </span>
            <span className="block truncate font-normal text-muted-foreground">
              @{user.username}
            </span>
          </span>
          <Badge variant="success">Active</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <CircleUserRoundIcon />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings2Icon />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            disabled={logout.isPending}
            onSelect={() => logout.mutate()}
          >
            {logout.isPending ? <Spinner /> : <LogOutIcon />}
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
