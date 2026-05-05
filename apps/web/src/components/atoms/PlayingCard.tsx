import { cn } from "@/lib/utils";

const SUIT_SYMBOL: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const RANK_DISPLAY: Record<string, string> = {
  T: "10",
};

export type Size = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-10 h-14 text-sm",
  md: "w-14 h-20 text-base",
  lg: "w-16 h-24 text-lg",
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
  const suit = card[1];
  const isRed = suit === "h" || suit === "d";
  const display = RANK_DISPLAY[rank] ?? rank;

  return (
    <div
      className={cn(
        "rounded-md bg-white shadow-md border border-gray-300 flex flex-col items-center justify-center font-bold leading-none select-none",
        isRed ? "text-red-600" : "text-black",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span>{display}</span>
      <span className="text-2xl leading-none">{SUIT_SYMBOL[suit]}</span>
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
  return (
    <div
      className={cn(
        "rounded-md border-2 border-[#00ff88] flex items-center justify-center select-none",
        SIZE_CLASSES[size],
        "bg-gradient-to-br from-[#0f5f3f] to-[#0a3f2f] shadow-md shadow-[#00ff88]/30",
        className,
      )}
    >
      <span className="text-[#00ff88] text-2xl font-bold opacity-70">♦</span>
    </div>
  );
}
