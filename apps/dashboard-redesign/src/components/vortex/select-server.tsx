"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  LogOutIcon,
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

/**
 * Server picker — split pane: a vertical workspace rail on the left where
 * servers stack under each other, and a live preview card on the right that
 * follows hover/selection. Click a workspace to open it.
 */
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
  const firstManageable = guilds.find((g) => g.botPresent)?.id ?? guilds[0]?.id ?? null;
  const [previewId, setPreviewId] = useState<string | null>(firstManageable);
  const preview = guilds.find((g) => g.id === previewId) ?? guilds[0] ?? null;

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
            preview, click to open the workspace.
          </p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          {/* Workspace rail — servers stacked under each other */}
          <div className="vx-panel anim-rise overflow-hidden rounded-2xl" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="flex items-center justify-between border-b border-[color:var(--glass-brd)] px-4 py-3.5">
              <p className="vx-label">workspaces</p>
              <p className="font-mono text-[10.5px] text-muted-foreground/80">
                {guilds.filter((g) => g.botPresent).length}/{guilds.length} online
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-white/[0.045]">
              {guilds.map((guild, index) => (
                <li key={guild.id} className="anim-rise" style={{ "--i": index + 2 } as React.CSSProperties}>
                  <button
                    onClick={() => guild.botPresent && onSelect(guild)}
                    onMouseEnter={() => setPreviewId(guild.id)}
                    onFocus={() => setPreviewId(guild.id)}
                    disabled={!guild.botPresent}
                    aria-label={`Preview ${guild.name}`}
                    className={cn(
                      "group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 focus-visible:outline-ring",
                      previewId === guild.id
                        ? "bg-white/[0.055]"
                        : "hover:bg-white/[0.03]",
                      !guild.botPresent && "opacity-55",
                    )}
                  >
                    <GuildAvatar
                      initials={guild.initials}
                      hue={guild.hue}
                      iconUrl={guild.iconUrl}
                      size={38}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold tracking-tight">
                        {guild.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                        {fmt.format(guild.memberCount)} members · {ROLE_LABEL[guild.role].toLowerCase()}
                      </span>
                    </span>
                    {guild.botPresent ? (
                      <span
                        className="vx-dot"
                        style={{ background: "var(--ok)", color: "var(--ok)" }}
                      />
                    ) : (
                      <UserPlusIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Live preview pane — sticks to the viewport and follows the scroll */}
          {preview ? (
            <div key={preview.id} className="anim-fade self-start lg:sticky lg:top-20">
              <TiltCard max={5} className="w-full">
              <div className="vx-panel vx-panel--beam flex flex-col overflow-hidden rounded-2xl">
                <div className="flex flex-col items-center gap-4 border-b border-[color:var(--glass-brd)] px-6 py-8 text-center">
                  <GuildAvatar
                    initials={preview.initials}
                    hue={preview.hue}
                    iconUrl={preview.iconUrl}
                    size={76}
                  />
                  <div>
                    <h2
                      className="text-[21px] font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-unbounded)" }}
                    >
                      {preview.name}
                    </h2>
                    <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                      {ROLE_LABEL[preview.role]} · {preview.id}
                    </p>
                  </div>
                  {preview.botPresent ? (
                    <span
                      className="vx-chip"
                      style={{
                        color: "var(--ok)",
                        borderColor: "color-mix(in srgb, var(--ok) 35%, transparent)",
                      }}
                    >
                      <WifiIcon className="size-3" aria-hidden="true" />
                      bot online
                    </span>
                  ) : (
                    <span className="vx-chip">
                      <UserPlusIcon className="size-3" aria-hidden="true" />
                      invite the bot to manage this guild
                    </span>
                  )}
                </div>

                <dl className="flex flex-col px-6 py-3">
                  {[
                    ["Members", fmt.format(preview.memberCount), "users"],
                    ["Online now", fmt.format(preview.onlineCount), "dot"],
                    ["Your access", ROLE_LABEL[preview.role], "shield"],
                  ].map(([label, value, icon]) => (
                    <div
                      key={label}
                      className="flex items-baseline border-b border-white/[0.045] py-3 last:border-0"
                    >
                      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
                      <dd className="vx-leader" />
                      <dd className="flex items-center gap-1.5 font-mono text-[12.5px]">
                        {icon === "users" && (
                          <UsersIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        )}
                        {icon === "dot" && (
                          <span className="vx-dot" style={{ background: "var(--ok)", color: "var(--ok)" }} />
                        )}
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-auto border-t border-[color:var(--glass-brd)] p-5">
                  {preview.botPresent ? (
                    <button
                      onClick={() => preview.botPresent && onSelect(preview)}
                      className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 hover:brightness-110 focus-visible:outline-ring"
                      style={{
                        background: "linear-gradient(120deg, var(--aurora-1), var(--aurora-2))",
                        boxShadow: "0 10px 26px -12px color-mix(in srgb, var(--aurora-1) 90%, transparent)",
                      }}
                    >
                      Open workspace
                      <ArrowRightIcon
                        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled
                      className="h-10 w-full rounded-xl border-[color:var(--glass-brd)] bg-white/[0.02] text-[13px]"
                    >
                      Bot install required
                    </Button>
                  )}
                </div>
              </div>
              </TiltCard>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
