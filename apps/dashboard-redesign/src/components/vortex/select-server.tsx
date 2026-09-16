"use client";

import { LogOutIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <div className="nx-grid-bg relative min-h-screen overflow-hidden bg-black">
      <div aria-hidden="true" className="nx-aurora" />
      <header className="relative flex items-center justify-between border-b border-border/60 px-6 py-4 sm:px-10">
        <VortexBrand size={30} />
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <UserAvatar name={user.globalName} avatarUrl={user.avatarUrl} size={30} />
            <span className="text-sm font-semibold">{user.globalName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-foreground">
            <LogOutIcon className="size-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-10">
        <div className="flex flex-col gap-2.5">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="nx-live-dot inline-block size-1.5 rounded-full bg-[#34d399] text-[#34d399]" />
            Authenticated · OAuth session active
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Choose a <span className="nx-shimmer nx-gradient-text">server</span> to manage
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Servers where you hold Owner, Administrator, or Manager access. The bot joins
            your workspace the moment it is present on the guild.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {guilds.map((guild) => {
            const manageable = guild.botPresent;
            return (
              <button
                key={guild.id}
                onClick={() => manageable && onSelect(guild)}
                disabled={!manageable}
                className={`nx-glass nx-lift group relative overflow-hidden rounded-xl p-5 text-left focus-visible:outline-ring ${
                  manageable
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-45"
                }`}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)" }}
                />
                <div className="flex items-start justify-between gap-3">
                  <GuildAvatar initials={guild.initials} hue={guild.hue} iconUrl={guild.iconUrl} size={46} />
                  {guild.botPresent ? (
                    <Badge className="border-transparent bg-[#34d399]/12 text-[#34d399] hover:bg-[#34d399]/20">
                      <span className="nx-live-dot mr-1.5 inline-block size-1.5 rounded-full bg-[#34d399] text-[#34d399]" />
                      Bot online
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Invite bot
                    </Badge>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-1">
                  <p className="truncate text-[15px] font-bold tracking-tight">{guild.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5" aria-hidden="true" />
                    {fmt.format(guild.memberCount)} members
                    {guild.onlineCount > 0 && (
                      <> · {fmt.format(guild.onlineCount)} online</>
                    )}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {ROLE_LABEL[guild.role]}
                  </span>
                  {manageable && (
                    <span className="text-xs font-semibold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      Open workspace →
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
