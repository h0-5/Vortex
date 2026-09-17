"use client";

import {
  ChevronRightIcon,
  LogOutIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuildAvatar, VortexBrand, UserAvatar } from "@/components/vortex/brand";
import { fmt, type Guild, type VortexUser } from "@/lib/vortex/data";

const ROLE_LABEL: Record<Guild["role"], string> = {
  OWNER: "Owner",
  ADMINISTRATOR: "Administrator",
  MANAGER: "Manager",
};

export function SelectServerScreen({
  user,
  guilds,
  onSelect,
  onLogout,
}: {
  user: VortexUser;
  guilds: Guild[];
  onSelect: (guild: Guild) => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
        <VortexBrand size={22} />
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <UserAvatar name={user.globalName} avatarUrl={user.avatarUrl} size={26} />
            <span className="text-[13px] font-semibold">{user.globalName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="h-8 gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            <LogOutIcon className="size-3.5" aria-hidden="true" />
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <div className="mb-8 flex flex-col gap-2">
          <p className="vl-label">Authenticated · OAuth session active</p>
          <h1
            className="text-[32px] font-bold tracking-tight sm:text-[36px]"
            style={{ fontFamily: "var(--font-grotesk)" }}
          >
            Your servers.
          </h1>
          <p className="max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
            Guilds where you hold Owner, Administrator, or Manager access. The bot
            joins the workspace the moment it is present on the server.
          </p>
        </div>

        <div className="vl-panel overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="vl-label">
              Workspaces · {guilds.filter((g) => g.botPresent).length} online
            </p>
            <p className="font-mono text-[10.5px] text-muted-foreground/80">
              {guilds.length} guilds
            </p>
          </div>
          <ul className="divide-y divide-border">
            {guilds.map((guild) => {
              const manageable = guild.botPresent;
              return (
                <li key={guild.id}>
                  <button
                    onClick={() => manageable && onSelect(guild)}
                    disabled={!manageable}
                    aria-label={`Open workspace ${guild.name}`}
                    className={`group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-150 focus-visible:outline-ring ${
                      manageable
                        ? "cursor-pointer hover:bg-accent"
                        : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <GuildAvatar
                      initials={guild.initials}
                      hue={guild.hue}
                      iconUrl={guild.iconUrl}
                      size={42}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold tracking-tight">
                        {guild.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                        <UsersIcon className="size-3.5" aria-hidden="true" />
                        {fmt.format(guild.memberCount)} members
                        {guild.onlineCount > 0 && (
                          <span className="font-mono text-[11px]">
                            · {fmt.format(guild.onlineCount)} online
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="vl-tag">{ROLE_LABEL[guild.role]}</span>

                    {guild.botPresent ? (
                      <span className="hidden items-center gap-1.5 font-mono text-[11px] text-[#12805c] sm:flex">
                        <span className="vl-dot vl-dot--live bg-[#12805c] text-[#12805c]" />
                        bot online
                      </span>
                    ) : (
                      <span className="hidden items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:flex">
                        <UserPlusIcon className="size-3.5" aria-hidden="true" />
                        invite bot
                      </span>
                    )}

                    <ChevronRightIcon
                      className="size-4 shrink-0 text-muted-foreground/60 transition-colors duration-150 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-5 font-mono text-[10.5px] text-muted-foreground/70">
          {guilds.filter((g) => !g.botPresent).length} of {guilds.length} guilds pending bot install
        </p>
      </main>
    </div>
  );
}
