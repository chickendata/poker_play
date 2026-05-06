"use client";

import { TrendingUp, DollarSign, Users } from "lucide-react";
import { formatChips } from "@/lib/utils";
import { useT } from "@/i18n/LocaleContext";

export interface PlayerStatsData {
  winRate: number;
  gamesPlayed: number;
  totalProfit: number;
  maxBuyIn: number;
  online: number;
}

export function PlayerStatsPanel({ stats }: { stats: PlayerStatsData }) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#1a7f5f] rounded-lg p-6 neon-border">
        <h3 className="text-lg font-bold text-[#00ff88] mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t("stats.title")}
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              {t("stats.winRate")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#00ff88]">
                {stats.winRate}%
              </p>
            </div>
          </div>
          <div className="h-px bg-[#2a2a2a]" />
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              {t("stats.gamesPlayed")}
            </p>
            <p className="text-xl font-bold text-white">{stats.gamesPlayed}</p>
          </div>
          <div className="h-px bg-[#2a2a2a]" />
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              {t("stats.totalProfit")}
            </p>
            <p className="text-xl font-bold text-green-400">
              ${formatChips(stats.totalProfit)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ff88] transition-colors">
          <DollarSign className="w-5 h-5 text-[#00ff88] mb-2" />
          <p className="text-xs text-gray-400">{t("stats.maxBuyIn")}</p>
          <p className="font-bold text-white mt-1">
            ${formatChips(stats.maxBuyIn)}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ff88] transition-colors">
          <Users className="w-5 h-5 text-[#00ff88] mb-2" />
          <p className="text-xs text-gray-400">{t("stats.online")}</p>
          <p className="font-bold text-white mt-1">{stats.online}</p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#1a7f5f] rounded-lg p-6">
        <h3 className="text-sm font-bold text-[#00ff88] mb-3 uppercase">
          {t("stats.houseRules")}
        </h3>
        <ul className="text-xs text-gray-400 space-y-2">
          <Rule>{t("stats.rule.allIn")}</Rule>
          <Rule>{t("stats.rule.noCollusion")}</Rule>
          <Rule>{t("stats.rule.fairPlay")}</Rule>
        </ul>
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-[#00ff88] flex-shrink-0">→</span>
      <span>{children}</span>
    </li>
  );
}
