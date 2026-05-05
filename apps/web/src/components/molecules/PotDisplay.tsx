import { NeonText } from "@/components/atoms/NeonText";

export interface PotDisplayProps {
  total: number;
  /** Optional breakdown when there are side pots. If omitted or single pot, shows total only. */
  sidePots?: { amount: number }[];
}

export function PotDisplay({ total, sidePots }: PotDisplayProps) {
  const hasSplit = sidePots && sidePots.length > 1;

  if (!hasSplit) {
    return (
      <div className="w-40 h-20 rounded-full border-2 border-dashed border-[#00ff88]/40 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xs text-[#a0a0a0] mb-1">POT</div>
          <NeonText className="text-2xl font-bold">
            ${total.toLocaleString()}
          </NeonText>
        </div>
      </div>
    );
  }

  // Multi-pot view: pill-shape with main + side breakdown
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#00ff88]/50 px-4 py-2 bg-black/30">
      <div className="text-center mb-1">
        <span className="text-[10px] text-[#a0a0a0] uppercase tracking-wider mr-2">
          Pot
        </span>
        <NeonText className="text-xl font-bold">
          ${total.toLocaleString()}
        </NeonText>
      </div>
      <div className="flex gap-3 text-xs justify-center">
        {sidePots!.map((p, i) => (
          <div key={i} className="text-center">
            <div className="text-[10px] text-gray-400 uppercase">
              {i === 0 ? "Main" : `Side ${i}`}
            </div>
            <div className="font-mono text-[#00ff88]">
              ${p.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
