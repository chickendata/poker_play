"use client";

import { NeonText } from "@/components/atoms/NeonText";
import { formatChips } from "@/lib/utils";
import { useT } from "@/i18n/LocaleContext";

export interface PotDisplayProps {
  total: number;
  /** Optional breakdown when there are side pots. If omitted or single pot, shows total only. */
  sidePots?: { amount: number }[];
}

export function PotDisplay({ total, sidePots }: PotDisplayProps) {
  const t = useT();
  const hasSplit = sidePots && sidePots.length > 1;

  if (!hasSplit) {
    return (
      <div className="w-40 h-20 rounded-full border-2 border-dashed border-[#00ff88]/40 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xs text-[#a0a0a0] mb-1 uppercase">
            {t("pot.label")}
          </div>
          <NeonText className="text-2xl font-bold">
            ${formatChips(total)}
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
          {t("pot.label")}
        </span>
        <NeonText className="text-xl font-bold">
          ${formatChips(total)}
        </NeonText>
      </div>
      <div className="flex gap-3 text-xs justify-center">
        {sidePots!.map((p, i) => (
          <div key={i} className="text-center">
            <div className="text-[10px] text-gray-400 uppercase">
              {i === 0 ? t("pot.main") : t("pot.side", { n: i })}
            </div>
            <div className="font-mono text-[#00ff88]">
              ${formatChips(p.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
