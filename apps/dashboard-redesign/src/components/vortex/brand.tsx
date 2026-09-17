import { cn } from "@/lib/utils";

export function VortexMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      src="/vortex-mark.png"
      alt="Vortex mark"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain select-none", className)}
      draggable={false}
    />
  );
}

/**
 * Brand lockup: the gradient mark lives on an ink tile so it keeps its
 * contrast on the paper canvas, next to a Space Grotesk wordmark.
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
        className="inline-flex shrink-0 items-center justify-center rounded-[7px] bg-ink"
        style={{ width: size + 10, height: size + 10 }}
      >
        <VortexMark size={size} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className="text-[15px] font-bold uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-grotesk)" }}
          >
            Vortex
          </span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            console
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        fontFamily: "var(--font-grotesk)",
        background: `hsl(${hue} 30% 90%)`,
        color: `hsl(${hue} 42% 30%)`,
        boxShadow: "inset 0 0 0 1px rgba(27,26,22,0.12)",
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
        fontFamily: "var(--font-grotesk)",
        background: "#E7E4DA",
        color: "#4A483F",
        boxShadow: "inset 0 0 0 1px rgba(27,26,22,0.14)",
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
