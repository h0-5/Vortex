"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  LogOutIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuildAvatar, VortexBrand, UserAvatar } from "@/components/vortex/brand";
import { cn } from "@/lib/utils";
import { fmt, type Guild, type VortexUser } from "@/lib/vortex/data";

const ROLE_LABEL: Record<Guild["role"], string> = {
  OWNER: "Owner",
  ADMINISTRATOR: "Administrator",
  MANAGER: "Manager",
};

/**
 * Split pane: workspace rail on the left, a live preview card on the right
 * that follows hover/selection. Click a workspace to open it.
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

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8">
        <div className="anim-rise mb-8 flex flex-col gap-2">
          <p className="vl-label">Authenticated · OAuth session active</p>
          <h1
            className="text-[32px] font-bold tracking-tight sm:text-[36px]"
            style={{ fontFamily: "var(--font-grotesk)" }}
          >
            Your servers.
          </h1>
          <p className="max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
            Guilds where you hold Owner, Administrator, or Manager access. Hover to
            preview, click to open the workspace.
          </p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Workspace rail */}
          <div className="vl-panel anim-rise overflow-hidden rounded-lg" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="vl-label">Workspaces</p>
              <p className="font-mono text-[10.5px] text-muted-foreground/80">
                {guilds.filter((g) => g.botPresent).length}/{guilds.length} online
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-border/70">
              {guilds.map((guild, index) => (
                <li key={guild.id} className="anim-rise" style={{ "--i": index + 1 } as React.CSSProperties}>
                  <button
                    onClick={() => guild.botPresent && onSelect(guild)}
                    onMouseEnter={() => setPreviewId(guild.id)}
                    onFocus={() => setPreviewId(guild.id)}
                    disabled={!guild.botPresent}
                    aria-label={`Preview ${guild.name}`}
                    className={cn(
                      "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-ring",
                      previewId === guild.id ? "bg-accent" : "hover:bg-accent/60",
                      !guild.botPresent && "opacity-55",
                    )}
                  >
                    <GuildAvatar
                      initials={guild.initials}
                      hue={guild.hue}
                      iconUrl={guild.iconUrl}
                      size={36}
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
                      <span className="vl-dot" style={{ background: "var(--ok)", color: "var(--ok)" }} />
                    ) : (
                      <UserPlusIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Preview pane */}
          {preview ? (
            <div
              key={preview.id}
              className="vl-panel anim-fade flex flex-col overflow-hidden rounded-lg"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <div className="flex flex-col items-center gap-4 border-b border-border px-6 py-7 text-center">
                <GuildAvatar
                  initials={preview.initials}
                  hue={preview.hue}
                  iconUrl={preview.iconUrl}
                  size={72}
                />
                <div>
                  <h2
                    className="text-[20px] font-bold tracking-tight"
                    style={{ fontFamily: "var(--font-grotesk)" }}
                  >
                    {preview.name}
                  </h2>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    {ROLE_LABEL[preview.role]} · {preview.id}
                  </p>
                </div>
                {preview.botPresent ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10.5px]"
                    style={{ color: "var(--ok)", borderColor: "color-mix(in srgb, var(--ok) 30%, transparent)" }}
                  >
                    <span className="vl-dot vl-dot--live" style={{ background: "var(--ok)", color: "var(--ok)" }} />
                    bot online
                  </span>
                ) : (
                  <span className="vl-tag gap-1.5">
                    <UserPlusIcon className="size-3" aria-hidden="true" />
                    invite the bot to manage this guild
                  </span>
                )}
              </div>

              <dl className="flex flex-col px-6 py-2">
                {[
                  ["Members", fmt.format(preview.memberCount)],
                  ["Online now", fmt.format(preview.onlineCount)],
                  ["Your access", ROLE_LABEL[preview.role]],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline border-b border-border/60 py-2.5 last:border-0">
                    <dt className="text-[12.5px] text-muted-foreground">{k}</dt>
                    <dd className="vl-leader" />
                    <dd className="flex items-center gap-1.5 font-mono text-[12px]">
                      {k === "Members" && <UsersIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto border-t border-border p-5">
                {preview.botPresent ? (
                  <button
                    onClick={() => preview.botPresent && onSelect(preview)}
                    className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink text-[13px] font-semibold text-paper transition-colors duration-150 hover:bg-ink/85 focus-visible:outline-ring"
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
                    className="h-10 w-full border-input text-[13px]"
                  >
                    Bot install required
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
