"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  LogOutIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
  WifiIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuildAvatar, SpaceBackdrop, TiltCard, UserAvatar, VortexBrand } from "@/components/vortex/brand";
import { cn } from "@/lib/utils";
import { fmt, type Guild, type VortexUser } from "@/lib/vortex/data";

const ROLE_LABEL: Record<Guild["role"], string> = {
  OWNER: "Owner",
  ADMINISTRATOR: "Administrator",
  MANAGER: "Manager",
};

/* Server picker — a field of floating 3D cards over the aurora backdrop. */
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
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <div className="relative flex min-h-screen flex-col">
      <SpaceBackdrop />

      <header className="sticky top-0 z-20 border-b border-[color:var(--glass-brd)] bg-[color:var(--glass-strong)] backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-5 sm:px-8">
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
              className="h-8 gap-1.5 rounded-lg text-[12.5px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOutIcon className="size-3.5" aria-hidden="true" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8">
        <div className="anim-rise mb-10 flex flex-col gap-3">
          <p className="vx-label">
            <span className="vx-grad-text font-semibold">authenticated</span> · oauth session active
          </p>
          <h1
            className="text-[30px] font-bold leading-tight tracking-tight sm:text-[38px]"
            style={{ fontFamily: "var(--font-unbounded)" }}
          >
            Your <span className="vx-grad-text">servers</span>.
          </h1>
          <p className="max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
            Guilds where you hold Owner, Administrator, or Manager access. Hover to
            feel them, click to open the workspace.
          </p>
        </div>

        <div className="vx-scene grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((guild, index) => (
            <TiltCard key={guild.id} className="anim-rise" style={{ "--i": index } as React.CSSProperties}>
              <button
                onClick={() => guild.botPresent && onSelect(guild)}
                onMouseEnter={() => setHoverId(guild.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(guild.id)}
                onBlur={() => setHoverId(null)}
                disabled={!guild.botPresent}
                aria-label={`Open ${guild.name} workspace`}
                className={cn(
                  "vx-panel vx-panel--beam group flex h-full w-full flex-col items-start gap-5 p-5 text-left transition-colors duration-200 focus-visible:outline-ring",
                  hoverId === guild.id && "border-[color:var(--glass-brd-strong)]",
                  !guild.botPresent && "opacity-55",
                )}
              >
                <div className="flex w-full items-start justify-between">
                  <GuildAvatar
                    initials={guild.initials}
                    hue={guild.hue}
                    iconUrl={guild.iconUrl}
                    size={52}
                  />
                  {guild.botPresent ? (
                    <span
                      className="vx-chip"
                      style={{ color: "var(--ok)", borderColor: "color-mix(in srgb, var(--ok) 35%, transparent)" }}
                    >
                      <WifiIcon className="size-3" aria-hidden="true" />
                      online
                    </span>
                  ) : (
                    <span className="vx-chip">
                      <UserPlusIcon className="size-3" aria-hidden="true" />
                      invite bot
                    </span>
                  )}
                </div>

                <div className="min-w-0 w-full">
                  <h2 className="truncate text-[16px] font-bold tracking-tight">{guild.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    <ShieldCheckIcon className="size-3" aria-hidden="true" />
                    {ROLE_LABEL[guild.role]}
                  </p>
                </div>

                <dl className="grid w-full grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[color:var(--glass-brd)] bg-white/[0.03] px-3 py-2">
                    <dt className="vx-label !text-[9px]">members</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-mono text-[13px]">
                      <UsersIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                      {fmt.format(guild.memberCount)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-[color:var(--glass-brd)] bg-white/[0.03] px-3 py-2">
                    <dt className="vx-label !text-[9px]">online</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-mono text-[13px]">
                      <span className="vx-dot" style={{ background: "var(--ok)", color: "var(--ok)" }} />
                      {fmt.format(guild.onlineCount)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto w-full">
                  {guild.botPresent ? (
                    <span
                      className={cn(
                        "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[12.5px] font-semibold transition-all duration-200",
                        "bg-gradient-to-r from-[color:var(--aurora-1)] to-[color:var(--aurora-2)] text-white shadow-[0_8px_22px_-10px_color-mix(in_srgb,var(--aurora-1)_90%,transparent)]",
                        hoverId === guild.id && "brightness-110",
                      )}
                    >
                      Open workspace
                      <ArrowRightIcon
                        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <span className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-[color:var(--glass-brd)] text-[12.5px] font-semibold text-muted-foreground">
                      Bot install required
                    </span>
                  )}
                </div>
              </button>
            </TiltCard>
          ))}
        </div>
      </main>
    </div>
  );
}
