import { cn } from "@/lib/utils";
import { SuitSymbol, type Suit } from "./SuitSymbol";

const RANK_DISPLAY: Record<string, string> = {
  T: "10",
};

export type Size = "sm" | "md" | "lg";

interface SizeSpec {
  card: string;
  rank: string;
  cornerSuit: string;
  centerSuit: string;
}

const SIZES: Record<Size, SizeSpec> = {
  sm: {
    card: "w-8 h-12 sm:w-10 sm:h-14",
    rank: "text-[9px] sm:text-[11px] leading-none",
    cornerSuit: "w-2 h-2 sm:w-2.5 sm:h-2.5",
    centerSuit: "w-4 h-4 sm:w-5 sm:h-5",
  },
  md: {
    card: "w-10 h-14 sm:w-14 sm:h-20",
    rank: "text-[11px] sm:text-sm leading-none",
    cornerSuit: "w-2.5 h-2.5 sm:w-3 sm:h-3",
    centerSuit: "w-5 h-5 sm:w-7 sm:h-7",
  },
  lg: {
    card: "w-14 h-20 sm:w-16 sm:h-24",
    rank: "text-sm sm:text-base leading-none",
    cornerSuit: "w-3 h-3 sm:w-3.5 sm:h-3.5",
    centerSuit: "w-7 h-7 sm:w-9 sm:h-9",
  },
};

export function PlayingCard({
  card,
  size = "md",
  className,
}: {
  card: string; // e.g. "As", "Th", "2c"
  size?: Size;
  className?: string;
}) {
  const rank = card[0];
  const suit = card[1] as Suit;
  const isRed = suit === "h" || suit === "d";
  const display = RANK_DISPLAY[rank] ?? rank;
  const s = SIZES[size];
  const ink = isRed ? "text-[#d40000]" : "text-[#0a0a0a]";

  return (
    <div
      className={cn(
        "relative rounded-md select-none overflow-hidden",
        "bg-gradient-to-br from-white via-white to-[#f0f0f0]",
        "shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(0,0,0,0.08)]",
        s.card,
        className,
      )}
    >
      {/* Top-left corner index */}
      <div
        className={cn(
          "absolute top-0.5 left-0.5 sm:top-1 sm:left-1 flex flex-col items-center font-bold leading-none",
          ink,
        )}
      >
        <span className={s.rank}>{display}</span>
        <SuitSymbol suit={suit} className={s.cornerSuit} />
      </div>

      {/* Center suit (opacity dampened so it doesn't compete with the corner indices) */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none",
          ink,
        )}
      >
        <SuitSymbol
          suit={suit}
          className={cn(s.centerSuit, "opacity-80")}
        />
      </div>

      {/* Bottom-right corner index (rotated 180°) */}
      <div
        className={cn(
          "absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex flex-col items-center font-bold leading-none rotate-180",
          ink,
        )}
      >
        <span className={s.rank}>{display}</span>
        <SuitSymbol suit={suit} className={s.cornerSuit} />
      </div>
    </div>
  );
}

export function CardBack({
  size = "md",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div
      className={cn(
        "relative rounded-md select-none overflow-hidden",
        "border border-[#00ff88]/60",
        "shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,255,136,0.15)]",
        "bg-gradient-to-br from-[#0a3f2f] via-[#0f5f3f] to-[#0a3f2f]",
        s.card,
        className,
      )}
    >
      {/* Diagonal cross-hatch pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(0,255,136,0.4) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, rgba(0,255,136,0.4) 0 1px, transparent 1px 6px)",
        }}
      />

      {/* Inner border frame */}
      <div className="absolute inset-1 sm:inset-1.5 rounded-sm border border-[#00ff88]/40" />

      {/* Center diamond emblem */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <SuitSymbol
            suit="d"
            className={cn(s.centerSuit, "text-[#00ff88]/80")}
          />
          {/* Glow halo */}
          <div className="absolute inset-0 blur-md opacity-60">
            <SuitSymbol
              suit="d"
              className={cn(s.centerSuit, "text-[#00ff88]")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
