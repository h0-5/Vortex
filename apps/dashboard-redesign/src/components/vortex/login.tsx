"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VortexBrand } from "@/components/vortex/brand";
import { SECURITY_FEATURES } from "@/lib/vortex/data";

/* Spec sheet shown on the ink panel — reads like a README, not marketing. */
const SPEC: Array<[string, string]> = [
  ["runtime", "discord.js · node 22"],
  ["storage", "postgresql 16"],
  ["auth", "oauth2 + pkce"],
  ["plugins", "schema-driven dashboards"],
  ["sessions", "aes-256-gcm at rest"],
];

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    onLogin();
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      {/* Ink spec panel — stays dark in both themes (terminal hero) */}
      <aside className="relative hidden flex-col justify-between bg-[#1b1a16] p-10 text-[#ece9dd] lg:flex">
        <VortexBrand size={26} />

        <div className="flex max-w-md flex-col gap-8">
          <p className="anim-rise vl-label !text-[#8f8c80]">Open-source Discord bot platform</p>
          <h1
            className="anim-rise text-[44px] font-bold leading-[1.08] tracking-tight"
            style={{ fontFamily: "var(--font-grotesk)", "--i": 1 } as React.CSSProperties }
          >
            The control room for your Discord community.
          </h1>
          <p
            className="anim-rise max-w-sm text-[14px] leading-relaxed text-[#b5b2a6]"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            One console for every server you operate — authenticate once, manage
            plugins, and read the gateway as it happens.
          </p>
          <dl
            className="anim-rise flex flex-col border-t border-[#33312a]"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            {SPEC.map(([key, value], index) => (
              <div
                key={key}
                className="anim-rise flex items-baseline border-b border-[#33312a] py-2.5"
                style={{ "--i": 4 + index } as React.CSSProperties}
              >
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#8f8c80]">
                  {key}
                </dt>
                <span className="vl-leader !border-[#3c3a32]" />
                <dd className="font-mono text-[12px] text-[#e5e2d7]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="anim-fade font-mono text-[11px] text-[#6e6b60]" style={{ "--i": 9 } as React.CSSProperties}>
          vortex console · v1.1 · api v1
        </p>
      </aside>

      {/* Auth column */}
      <main className="vl-canvas flex flex-1 flex-col">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <div className="lg:hidden">
            <VortexBrand size={24} />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="vl-panel anim-rise w-full max-w-[420px] rounded-lg p-8 sm:p-10">
            <div className="flex flex-col gap-1.5">
              <h2
                className="text-[22px] font-bold tracking-tight"
                style={{ fontFamily: "var(--font-grotesk)" }}
              >
                Sign in
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Authenticate with Discord to open your workspaces. Credentials
                never leave the server.
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleLogin}
              disabled={loading}
              className="mt-7 h-11 w-full rounded-md text-[14px] font-semibold text-white transition-colors duration-150 hover:brightness-110 disabled:opacity-70"
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

            <div className="my-7 h-px bg-border" />

            <p className="vl-label mb-3">Platform security</p>
            <ul className="flex flex-col">
              {SECURITY_FEATURES.map((f) => (
                <li
                  key={f.title}
                  className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2.5 last:border-0 last:pb-0"
                >
                  <span className="text-[12.5px] font-semibold">{f.title}</span>
                  <span className="max-w-[190px] text-right text-[11px] leading-snug text-muted-foreground">
                    {f.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-border px-6 py-3.5 font-mono text-[10.5px] text-muted-foreground/80">
          <span>vortex — open-source discord bot platform</span>
          <span>v1.0 · phase 2</span>
        </footer>
      </main>
    </div>
  );
}
