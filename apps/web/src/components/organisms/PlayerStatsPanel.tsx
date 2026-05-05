import { TrendingUp, DollarSign, Users } from "lucide-react";

export interface PlayerStatsData {
  winRate: number;
  gamesPlayed: number;
  totalProfit: number;
  maxBuyIn: number;
  online: number;
}

export function PlayerStatsPanel({ stats }: { stats: PlayerStatsData }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#1a7f5f] rounded-lg p-6 neon-border">
        <h3 className="text-lg font-bold text-[#00ff88] mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Your Stats
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Win Rate
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
              Games Played
            </p>
            <p className="text-xl font-bold text-white">{stats.gamesPlayed}</p>
          </div>
          <div className="h-px bg-[#2a2a2a]" />
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Total Profit
            </p>
            <p className="text-xl font-bold text-green-400">
              ${stats.totalProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ff88] transition-colors">
          <DollarSign className="w-5 h-5 text-[#00ff88] mb-2" />
          <p className="text-xs text-gray-400">Max Buy-In</p>
          <p className="font-bold text-white mt-1">
            ${stats.maxBuyIn.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ff88] transition-colors">
          <Users className="w-5 h-5 text-[#00ff88] mb-2" />
          <p className="text-xs text-gray-400">Online</p>
          <p className="font-bold text-white mt-1">{stats.online}</p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#1a7f5f] rounded-lg p-6">
        <h3 className="text-sm font-bold text-[#00ff88] mb-3 uppercase">
          House Rules
        </h3>
        <ul className="text-xs text-gray-400 space-y-2">
          <Rule>All-in allowed</Rule>
          <Rule>No collusion</Rule>
          <Rule>Fair play guaranteed</Rule>
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
