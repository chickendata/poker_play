import { cn } from "@/lib/utils";

export type Suit = "s" | "h" | "d" | "c";

const PATHS: Record<Suit, string> = {
  // Spade — pointing-down leaf with a stem
  s: "M50 6 C36 22, 14 36, 14 58 C14 73, 26 84, 41 84 C46 84, 51 82, 54 79 L50 96 L70 96 L66 79 C69 82, 74 84, 79 84 C94 84, 106 73, 106 58 C106 36, 84 22, 70 6 C66 1, 54 1, 50 6 Z",
  // Heart — two lobes
  h: "M60 96 C40 78, 12 60, 12 36 C12 22, 24 12, 38 12 C46 12, 54 17, 60 25 C66 17, 74 12, 82 12 C96 12, 108 22, 108 36 C108 60, 80 78, 60 96 Z",
  // Diamond — square rotated 45°
  d: "M60 6 L108 54 L60 102 L12 54 Z",
  // Club — three lobes + stem
  c: "M60 8 C50 8, 42 16, 42 26 C42 30, 43 33, 45 36 C32 32, 18 40, 18 54 C18 67, 28 76, 40 76 C46 76, 51 73, 54 70 C53 73, 53 76, 54 78 L48 96 L72 96 L66 78 C67 76, 67 73, 66 70 C69 73, 74 76, 80 76 C92 76, 102 67, 102 54 C102 40, 88 32, 75 36 C77 33, 78 30, 78 26 C78 16, 70 8, 60 8 Z",
};

const VIEWBOXES: Record<Suit, string> = {
  s: "0 0 120 100",
  h: "0 0 120 100",
  d: "0 0 120 108",
  c: "0 0 120 100",
};

/** Standard playing-card suit symbol as inline SVG so it renders identically across fonts/OSes. */
export function SuitSymbol({
  suit,
  className,
}: {
  suit: Suit;
  className?: string;
}) {
  return (
    <svg
      viewBox={VIEWBOXES[suit]}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      <path d={PATHS[suit]} fill="currentColor" />
    </svg>
  );
}
