"use client";

import { useState } from "react";
import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpaceBackdrop, VortexBrand, VortexMark } from "@/components/vortex/brand";
import { SECURITY_FEATURES } from "@/lib/vortex/data";

/* Floating spec chips orbiting the hero prism. */
const SPEC: Array<[string, string]> = [
  ["runtime", "discord.js · node 22"],
  ["storage", "postgresql 16"],
  ["auth", "oauth2 + pkce"],
  ["plugins", "schema-driven"],
  ["sessions", "aes-256-gcm"],
];

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    onLogin();
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <SpaceBackdrop />

      {/* 3D showcase column */}
      <aside className="relative hidden flex-col items-start justify-between p-10 lg:flex">
        <VortexBrand size={26} />

        <div className="flex flex-col items-center gap-9 self-center">
          {/* prism + orbit rings */}
          <div className="anim-pop relative grid place-items-center" style={{ perspective: "900px" }}>
            <span className="vx-orbit grid place-items-center">
              <span className="relative grid place-items-center">
                <span className="vx-halo" />
                <VortexMark size={110} className="vx-float relative" />
              </span>
            </span>
          </div>

          <div className="vx-scene grid gap-3">
            {SPEC.map(([key, value], index) => (
              <div
                key={key}
                className="anim-rise flex items-center gap-3 rounded-xl border border-[color:var(--glass-brd)] bg-[color:var(--glass)] px-4 py-2.5 backdrop-blur-md"
                style={
                  {
                    "--i": index + 2,
                    transform: `translateX(${index % 2 === 0 ? -22 : 26}px)`,
                  } as React.CSSProperties
                }
              >
                <span className="size-1.5 shrink-0 rounded-full bg-gradient-to-r from-[color:var(--aurora-1)] to-[color:var(--aurora-2)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {key}
                </span>
                <span className="vx-leader !mx-1 !w-8 flex-none" />
                <span className="font-mono text-[11.5px] text-foreground/90">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="anim-fade font-mono text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground/70" style={{ "--i": 8 } as React.CSSProperties}>
          vortex nexus · v2.0 · api v1
        </p>
      </aside>

      {/* Auth column */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <div className="lg:hidden">
            <VortexBrand size={24} />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="vx-panel vx-panel--beam anim-rise w-full max-w-[430px] p-8 sm:p-10" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="flex flex-col gap-2">
              <p className="vx-label">access terminal</p>
              <h2
                className="text-[24px] font-bold tracking-tight"
                style={{ fontFamily: "var(--font-unbounded)" }}
              >
                Sign in
              </h2>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                Authenticate with Discord to open your workspaces. Credentials
                never leave the server.
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleLogin}
              disabled={loading}
              className="mt-7 h-12 w-full rounded-xl text-[14px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(88,101,242,0.7)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_14px_36px_-10px_rgba(88,101,242,0.85)] disabled:opacity-70"
              style={{ background: "#5865F2" }}
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                  Redirecting to Discord…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
                    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
                  </svg>
                  Continue with Discord
                </>
              )}
            </Button>

            <div className="vx-grad-line my-7" />

            <p className="vx-label mb-3">platform security</p>
            <ul className="flex flex-col">
              {SECURITY_FEATURES.map((f, index) => (
                <li
                  key={f.title}
                  className="flex items-baseline justify-between gap-4 border-b border-[color:var(--glass-brd)] py-2.5 last:border-0 last:pb-0"
                >
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold">
                    <ShieldCheckIcon
                      className="size-3.5 text-[color:var(--ok)]"
                      style={{ opacity: 1 - index * 0.12 }}
                      aria-hidden="true"
                    />
                    {f.title}
                  </span>
                  <span className="max-w-[190px] text-right text-[11px] leading-snug text-muted-foreground">
                    {f.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-[color:var(--glass-brd)] px-6 py-3.5 font-mono text-[10.5px] text-muted-foreground/70">
          <span>vortex — open-source discord bot platform</span>
          <span>nexus · phase 2</span>
        </footer>
      </main>
    </div>
  );
}
