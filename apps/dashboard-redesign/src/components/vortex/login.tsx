"use client";

import { useState } from "react";
import { DatabaseIcon, Loader2Icon, ServerIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VortexBrand } from "@/components/vortex/brand";
import { SECURITY_FEATURES } from "@/lib/vortex/data";

const PLATFORM_POINTS = [
  {
    title: "Secure Discord OAuth",
    description: "Your Discord credentials remain server-side, always.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Multi-server foundation",
    description: "One focused workspace for every server you manage.",
    icon: ServerIcon,
  },
  {
    title: "Persistent core data",
    description: "Accounts and server context backed by PostgreSQL.",
    icon: DatabaseIcon,
  },
];

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(onLogin, 700);
  };

  return (
    <div className="nx-grid-bg flex min-h-screen flex-col bg-black">
      <div className="grid flex-1 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Brand hero */}
        <section className="hidden flex-col border-r border-border/60 p-10 lg:flex">
          <VortexBrand size={36} />
          <div className="my-auto flex max-w-xl flex-col gap-9">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Open-source Discord bot platform
              </p>
              <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight">
                Discord infrastructure,
                <br />
                <span className="nx-gradient-text">organized & sharp.</span>
              </h1>
              <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Vortex gives your community a secure control room — authenticate with Discord,
                manage every server you own, and plug in the modules your team needs.
              </p>
            </div>
            <div className="flex flex-col gap-5">
              {PLATFORM_POINTS.map((point) => (
                <div key={point.title} className="flex items-start gap-4">
                  <span className="nx-panel flex size-10 shrink-0 items-center justify-center rounded-lg text-primary">
                    <point.icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{point.title}</p>
                    <p className="text-sm text-muted-foreground">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60">
            Phase 1 core foundation · API v1 · discord.js runtime
          </p>
        </section>

        {/* Auth card */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="nx-gradient-border nx-glow-soft w-full max-w-md rounded-xl bg-card/80 p-8 backdrop-blur-sm sm:p-10">
            <div className="mb-8 flex flex-col items-center gap-4 text-center lg:hidden">
              <VortexBrand size={44} />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in with Discord to access your servers.
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleLogin}
              disabled={loading}
              className="nx-gradient nx-glow mt-8 h-12 w-full rounded-lg text-[15px] font-bold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4.5 animate-spin" aria-hidden="true" />
                  Establishing secure session…
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

            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
                Secured by design
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <ul className="flex flex-col gap-3">
              {SECURITY_FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-2.5">
                  <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-[#22d3ee]" aria-hidden="true" />
                  <div>
                    <span className="text-[13px] font-semibold">{f.title}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {f.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <footer className="mt-auto flex items-center justify-between border-t border-border/60 px-8 py-4 text-xs text-muted-foreground/60">
        <span>Vortex — open-source Discord bot platform</span>
        <span className="font-mono">v0.1.0 · phase 1 core</span>
      </footer>
    </div>
  );
}
