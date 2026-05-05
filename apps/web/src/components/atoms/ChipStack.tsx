const CHIP_COLORS = [
  { bg: "#ff0055", border: "#ff3366", glow: "#ff005588" },
  { bg: "#ffaa00", border: "#ffbb00", glow: "#ffaa0088" },
  { bg: "#0088ff", border: "#0099ff", glow: "#0088ff88" },
  { bg: "#ffaa00", border: "#ffbb00", glow: "#ffaa0088" },
];

export function ChipStack({ animated = true }: { animated?: boolean }) {
  return (
    <div className={animated ? "chip-stack-anim" : undefined}>
      <div className="relative flex flex-col items-center justify-center w-16 h-12">
        {CHIP_COLORS.map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full border shadow-lg"
            style={{
              width: `${60 - i * 8}px`,
              height: `${28 - i * 6}px`,
              backgroundColor: c.bg,
              borderColor: c.border,
              transform: `translateY(${i * 6}px) scale(${1 - i * 0.05})`,
              boxShadow: `0 0 ${10 + i * 3}px ${c.glow}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
