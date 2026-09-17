"use client";

import { useCallback, useEffect, useState } from "react";
import { SpaceBackdrop, VortexMark } from "@/components/vortex/brand";

const WORD = "VORTEX".split("");

/**
 * Cinematic entrance: aurora blooms → prism spins in (CSS 3D) → wordmark
 * letters flip through rotateX → tagline settles → progress fills → the
 * whole scene lifts away in a blur. Plays once per browser session,
 * click / Esc / Enter skips, and it never renders under reduced motion.
 */
export function IntroSplash() {
  /* "pending" renders nothing on server + first client pass (SSR-safe),
     then the session flag decides: play now, or stay gone. */
  const [phase, setPhase] = useState<"pending" | "play" | "out" | "gone">("pending");

  const finish = useCallback(() => {
    setPhase((current) => {
      if (current !== "play") return current;
      try {
        sessionStorage.setItem("vx-intro", "seen");
      } catch {
        /* private mode — replays next session, harmless */
      }
      return "out";
    });
  }, []);

  /* decide on mount — deferred to rAF so we never setState synchronously
     inside the effect body (and so first paint stays untouched) */
  useEffect(() => {
    const decide = () => {
      /* ?intro=1 — force a replay (demo link), ignoring the session flag */
      let force = false;
      try {
        force = new URLSearchParams(window.location.search).has("intro");
      } catch {
        force = false;
      }
      if (force) {
        try {
          sessionStorage.removeItem("vx-intro");
        } catch {
          /* ignore */
        }
        setPhase("play");
        return;
      }
      let seen = false;
      try {
        seen = sessionStorage.getItem("vx-intro") === "seen";
      } catch {
        seen = false;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (seen || reduced) {
        try {
          sessionStorage.setItem("vx-intro", "seen");
        } catch {
          /* ignore */
        }
        setPhase("gone");
        return;
      }
      setPhase("play");
    };
    const raf = requestAnimationFrame(decide);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* auto-finish + keyboard skip while playing */
  useEffect(() => {
    if (phase !== "play") return;
    const timer = window.setTimeout(finish, 3450);
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") finish();
    };
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skip);
    };
  }, [phase, finish]);

  /* unmount after exit animation */
  useEffect(() => {
    if (phase !== "out") return;
    const timer = window.setTimeout(() => setPhase("gone"), 700);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "pending" || phase === "gone") return null;

  return (
    <div
      className={phase === "out" ? "vx-intro vx-intro--out" : "vx-intro"}
      onClick={finish}
      role="presentation"
      aria-hidden="true"
    >
      <SpaceBackdrop floor />

      {/* prism + orbit rings */}
      <div className="vx-intro-mark relative mb-8 grid place-items-center">
        <span className="vx-orbit grid place-items-center">
          <span className="relative grid place-items-center">
            <span className="vx-halo" />
            <VortexMark size={92} className="vx-float relative" />
          </span>
        </span>
      </div>

      {/* wordmark — letters flip through 3D */}
      <h1
        className="flex select-none flex-wrap justify-center"
        style={{ fontFamily: "var(--font-unbounded)", perspective: "700px" }}
        aria-label="Vortex"
      >
        {WORD.map((letter, index) => (
          <span
            key={index}
            className="vx-intro-letter vx-grad-text text-[52px] font-bold leading-none sm:text-[76px]"
            style={{ "--i": index } as React.CSSProperties}
          >
            {letter}
          </span>
        ))}
      </h1>

      <p
        className="vx-intro-tag mt-5 font-mono text-[11px] uppercase text-muted-foreground"
        dir="ltr"
      >
        community control plane
      </p>

      {/* progress hairline */}
      <div className="mt-9 h-px w-56 overflow-hidden rounded-full bg-white/10">
        <div className="vx-intro-bar h-full bg-gradient-to-r from-[color:var(--aurora-1)] via-[color:var(--aurora-2)] to-[color:var(--aurora-3)] shadow-[0_0_14px_color-mix(in_srgb,var(--aurora-1)_80%,transparent)]" />
      </div>

      <p className="vx-intro-skip absolute bottom-7 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
        click anywhere to skip
      </p>
    </div>
  );
}
