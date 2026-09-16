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

export function VortexBrand({
  size = 32,
  compact = false,
  className,
}: {
  size?: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <VortexMark size={size} className="nx-glow-soft rounded-md" />
      {!compact && (
        <span className="text-[17px] font-extrabold tracking-tight">
          Vor<span className="nx-gradient-text">tex</span>
        </span>
      )}
    </span>
  );
}

export function GuildAvatar({
  initials,
  hue,
  size = 40,
  className,
}: {
  initials: string;
  hue: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold text-white/90",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${hue} 72% 46% / 0.9), hsl(${(hue + 40) % 360} 80% 38% / 0.9))`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.14), 0 0 18px -8px hsl(${hue} 80% 55% / 0.7)`,
      }}
    >
      {initials}
    </span>
  );
}

export function UserAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
      }}
    >
      {initials}
    </span>
  );
}
