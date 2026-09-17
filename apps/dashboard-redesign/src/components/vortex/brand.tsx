"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline prism mark — a faceted "V" inside a hex prism outline with the
 * aurora gradient. Replaces the raster logo so the whole identity is vector.
 */
export function VortexMark({ className, size = 32 }: { className?: string; size?: number }) {
  const uid = useId();
  const gradA = `vxa-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;
  const gradB = `vxb-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradA} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="var(--aurora-1)" />
          <stop offset="55%" stopColor="var(--aurora-2)" />
          <stop offset="100%" stopColor="var(--aurora-3)" />
        </linearGradient>
        <linearGradient id={gradB} x1="0" y1="48" x2="48" y2="0">
          <stop offset="0%" stopColor="var(--aurora-2)" />
          <stop offset="100%" stopColor="var(--aurora-1)" />
        </linearGradient>
      </defs>
      {/* hex prism */}
      <path
        d="M24 3 41 13v22L24 45 7 35V13L24 3Z"
        fill="color-mix(in srgb, var(--aurora-1) 9%, transparent)"
        stroke={`url(#${gradA})`}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* prism facets */}
      <path d="M24 3 24 20.5M24 45 24 27.5M7 13 24 20.5 41 13" stroke={`url(#${gradB})`} strokeWidth="1" opacity="0.5" />
      {/* blade V */}
      <path
        d="M15.5 16.5 24 33.5 32.5 16.5"
        fill="none"
        stroke={`url(#${gradA})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
 * Brand lockup: prism mark on a glass tile + Unbounded wordmark.
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
        className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[9px] border border-[color:var(--glass-brd)]"
        style={{
          width: size + 10,
          height: size + 10,
          background: "linear-gradient(150deg, rgba(124,108,255,0.16), rgba(34,211,238,0.08) 60%, rgba(244,113,181,0.1))",
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
