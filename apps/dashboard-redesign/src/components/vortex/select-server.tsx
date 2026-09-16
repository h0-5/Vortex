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
    <div className="nx-grid-bg min-h-screen bg-black">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4 sm:px-10">
        <VortexBrand size={30} />
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <UserAvatar name={user.globalName} size={30} />
            <span className="text-sm font-semibold">{user.globalName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-foreground">
            <LogOutIcon className="size-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-10">
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Authenticated · OAuth session active
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Choose a <span className="nx-gradient-text">server</span> to manage
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
                className={`nx-panel group relative overflow-hidden rounded-xl p-5 text-left transition-all duration-200 focus-visible:outline-ring ${
                  manageable
                    ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_36px_-12px_rgba(139,92,246,0.55)]"
                    : "cursor-not-allowed opacity-45"
                }`}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)" }}
                />
                <div className="flex items-start justify-between gap-3">
                  <GuildAvatar initials={guild.initials} hue={guild.hue} size={46} />
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
                    {fmt.format(guild.memberCount)} members · {fmt.format(guild.onlineCount)} online
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
