"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Brand mark — the official Vortex blade logo (trimmed, optimized raster).
 * Single source of truth: intro splash, boot screen, login hero, masthead,
 * studio drawer and api view all render through this component.
 */
export function VortexMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      src="/vortex-logo.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("shrink-0 select-none", className)}
      style={{
        filter:
          "drop-shadow(0 8px 22px color-mix(in srgb, var(--aurora-1) 26%, transparent))",
      }}
    />
  );
}

/** Fixed deep-space backdrop: stars + drifting aurora + perspective floor. */
export function SpaceBackdrop({ floor = true }: { floor?: boolean }) {
  return (
    <div className="vx-backdrop" aria-hidden="true">
      <div className="vx-space" />
      <div className="vx-stars" />
      <div className="vx-stars--2" />
      <div className="vx-aurora">
        <span className="vx-aurora-b" />
      </div>
      {floor ? <div className="vx-floor" /> : null}
    </div>
  );
}

/**
 * Pointer-tracked 3D tilt wrapper. Writes --rx/--ry/--gx/--gy CSS vars via
 * rAF — zero re-renders, transform-only, GPU friendly.
 */
export function TiltCard({
  className,
  children,
  max = 7,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  max?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (event.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(0.5 - py) * max}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * max}deg`);
      el.style.setProperty("--gx", `${px * 100}%`);
      el.style.setProperty("--gy", `${py * 100}%`);
    });
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--gx", "50%");
    el.style.setProperty("--gy", "50%");
  };

  return (
    <div ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className={cn("vx-tilt", className)} style={style}>
      {children}
    </div>
  );
}

/**
 * Brand lockup: blade mark on a neutral glass tile + Unbounded wordmark.
 * The tile stays colorless so the logo's own gradient carries the identity.
 */
export function VortexBrand({
  size = 26,
  compact = false,
  className,
}: {
  size?: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[color:var(--glass-brd)]"
        style={{
          width: size + 10,
          height: size + 10,
          background: "linear-gradient(150deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02) 65%)",
        }}
      >
        <VortexMark size={size} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className="vx-grad-text text-[14px] font-bold uppercase tracking-[0.1em]"
            style={{ fontFamily: "var(--font-unbounded)" }}
          >
            Vortex
          </span>
          <span className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.3em] text-muted-foreground">
            nexus
          </span>
        </span>
      )}
    </span>
  );
}

export function GuildAvatar({
  initials,
  hue,
  iconUrl,
  size = 40,
  className,
}: {
  initials: string;
  hue: number;
  iconUrl?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        fontFamily: "var(--font-outfit)",
        background: `linear-gradient(150deg, hsl(${hue} 65% 24%), hsl(${(hue + 40) % 360} 70% 14%))`,
        color: `hsl(${hue} 95% 78%)`,
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.14), 0 6px 18px -8px rgba(2,3,10,0.9)",
      }}
    >
      {iconUrl ? (
        <>
          <span aria-hidden="true">{initials}</span>
          <img
            src={iconUrl}
            alt={initials}
            width={size}
            height={size}
            className="absolute inset-0 size-full object-cover select-none"
            draggable={false}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </>
      ) : (
        initials
      )}
    </span>
  );
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        fontFamily: "var(--font-outfit)",
        background: "linear-gradient(150deg, rgba(124,108,255,0.35), rgba(34,211,238,0.2))",
        color: "#e6e9ff",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
      }}
    >
      {avatarUrl ? (
        <>
          <span aria-hidden="true">{initials}</span>
          <img
            src={avatarUrl}
            alt={name}
            width={size}
            height={size}
            className="absolute inset-0 size-full object-cover select-none"
            draggable={false}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </>
      ) : (
        initials
      )}
    </span>
  );
}
